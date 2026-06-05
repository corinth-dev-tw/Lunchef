import { Hono } from 'hono';
import type { Env } from '../index';
import type { LineUser } from '../index';
import { lineAuthMiddleware } from '../middleware/auth';

const app = new Hono<{
  Bindings: Env;
  Variables: { user: LineUser };
}>();

interface LoginBody {
  name?: string;
}

// POST /api/users/login — verify LINE access token and get/create user
// Frontend must send Authorization: Bearer <liff_access_token>
// https://developers.line.biz/en/reference/line-login/#get-user-profile
app.post('/login', async (c) => {
  try {
    const authHeader = c.req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return c.json({ error: 'Missing Authorization header' }, 401);
    }

    const accessToken = authHeader.slice(7);
    const body = await c.req.json<LoginBody>();

    // Verify access token with LINE Profile API
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!profileRes.ok) {
      return c.json({ error: 'Invalid or expired LINE token' }, 401);
    }

    const profile = (await profileRes.json()) as {
      userId: string;
      displayName: string;
      pictureUrl?: string;
    };

    const lineUserId = profile.userId;
    const displayName = body?.name || profile.displayName;

    // Check if user exists
    const user = await c.env.DB.prepare(
      `SELECT u.*, c.name as company_name, c.tax_id
       FROM users u
       JOIN companies c ON u.company_id = c.id
       WHERE u.line_user_id = ? AND u.is_active = 1`
    ).bind(lineUserId).first<{
      id: number;
      line_user_id: string;
      company_id: number;
      name: string;
      phone: string | null;
      role: string;
      company_name: string;
      tax_id: string;
    }>();

    if (user) {
      return c.json(user);
    }

    // User not found — require admin registration for B2B onboarding
    return c.json({ error: 'Account not registered. Please contact your company admin to set up access.' }, 403);
  } catch (error) {
    console.error('Login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// GET /api/users/:id — protected by LINE auth, users can only access their own profile
app.get('/:id', lineAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const authUser = c.get('user');

  const authedUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE line_user_id = ? AND is_active = 1'
  ).bind(authUser.lineUserId).first<{ id: number }>();

  if (!authedUser || authedUser.id !== parseInt(id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  const user = await c.env.DB.prepare(
    `SELECT u.*, c.name as company_name, c.tax_id
     FROM users u
     JOIN companies c ON u.company_id = c.id
     WHERE u.id = ?`
  ).bind(id).first();

  if (!user) return c.json({ error: 'User not found' }, 404);
  return c.json(user);
});

export default app;
