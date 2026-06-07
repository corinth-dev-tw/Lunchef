import { Hono } from 'hono';
import type { Env } from '../index';
import { LineLoginSchema } from '../lib/validation';
import { t, getLocale } from '../i18n';

const app = new Hono<{ Bindings: Env }>();

// POST /api/staff/register — self-register via LINE
app.post('/register', async (c) => {
  const locale = getLocale(c);
  try {
    const body = await c.req.json();
    const parsed = LineLoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: t('errors.invalidInput', locale), details: parsed.error.issues }, 400);
    }
    const { access_token } = parsed.data;

    // Verify with LINE Profile API
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return c.json({ error: t('errors.invalidLineToken', locale) }, 401);
    }

    const profile = (await profileRes.json()) as { userId: string; displayName: string };
    const lineUserId = profile.userId;
    const name = profile.displayName;

    // Upsert staff request
    const existing = await c.env.DB.prepare(
      'SELECT id, status FROM staff_requests WHERE line_user_id = ?'
    ).bind(lineUserId).first<{ id: number; status: string }>();

    if (existing) {
      return c.json({
        success: true,
        status: existing.status,
        name,
        message: statusMessage(existing.status, locale),
      });
    }

    await c.env.DB.prepare(
      'INSERT INTO staff_requests (line_user_id, name, status) VALUES (?, ?, ?)'
    ).bind(lineUserId, name, 'pending').run();

    return c.json({
      success: true,
      status: 'pending',
      name,
      message: statusMessage('pending', locale),
    });
  } catch (error) {
    console.error('Staff register error:', error);
    return c.json({ error: t('errors.registrationFailed', getLocale(c)) }, 500);
  }
});

// POST /api/staff/status — check current registration status
app.post('/status', async (c) => {
  const locale = getLocale(c);
  try {
    const body = await c.req.json();
    const parsed = LineLoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: t('errors.invalidInput', locale), details: parsed.error.issues }, 400);
    }
    const { access_token } = parsed.data;

    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return c.json({ error: t('errors.invalidLineToken', locale) }, 401);
    }

    const profile = (await profileRes.json()) as { userId: string; displayName: string };
    const lineUserId = profile.userId;

    // Check staff_requests
    const request = await c.env.DB.prepare(
      `SELECT sr.*, r.name as restaurant_name
       FROM staff_requests sr
       LEFT JOIN restaurants r ON sr.restaurant_id = r.id
       WHERE sr.line_user_id = ?`
    ).bind(lineUserId).first<{
      status: string;
      name: string;
      restaurant_name: string | null;
      role: string;
    }>();

    if (!request) {
      return c.json({ status: 'not_registered', name: profile.displayName, message: t('staff.notRegistered', locale) });
    }

    return c.json({
      status: request.status,
      name: request.name,
      restaurant_name: request.restaurant_name,
      role: request.role,
      message: statusMessage(request.status, locale),
    });
  } catch (error) {
    console.error('Staff status error:', error);
    return c.json({ error: t('errors.statusCheckFailed', locale) }, 500);
  }
});

function statusMessage(status: string, locale: ReturnType<typeof getLocale>): string {
  switch (status) {
    case 'pending': return t('staff.statusPending', locale);
    case 'approved': return t('staff.statusApproved', locale);
    case 'rejected': return t('staff.statusRejected', locale);
    default: return t('staff.statusUnknown', locale);
  }
}

export default app;
