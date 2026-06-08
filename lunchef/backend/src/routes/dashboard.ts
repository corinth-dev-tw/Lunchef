import { Hono } from 'hono';
import type { Env } from '../index';
import { dashboardAuthMiddleware } from '../middleware/auth';
import { sendLineMessage, createStatusUpdateFlex } from '../utils/line';
import { LineLoginSchema, UpdateOrderStatusSchema, DashboardOrdersQuerySchema, DateQuerySchema } from '../lib/validation';
import { buildSessionCookie, parseCookie } from '../utils/crypto';
import { t, getLocale } from '../i18n';

const app = new Hono<{
  Bindings: Env;
  Variables: { restaurantId: number };
}>();



// POST /api/dashboard/line-login — authenticate staff via LINE
app.post('/line-login', async (c) => {
  const locale = getLocale(c);
  try {
    const body = await c.req.json();
    const parsed = LineLoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: t('errors.invalidInput', locale), details: parsed.error.issues }, 400);
    }
    const { access_token } = parsed.data;

    // Verify token with LINE Profile API
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return c.json({ error: t('errors.invalidLineToken', locale) }, 401);
    }

    const profile = (await profileRes.json()) as { userId: string; displayName: string };
    const lineUserId = profile.userId;

    // Find staff member
    const staff = await c.env.DB.prepare(
      `SELECT rs.*, r.name as restaurant_name
       FROM restaurant_staff rs
       JOIN restaurants r ON rs.restaurant_id = r.id
       WHERE rs.line_user_id = ? AND rs.is_active = 1 AND r.is_active = 1`
    ).bind(lineUserId).first<{
      restaurant_id: number;
      name: string;
      role: string;
      restaurant_name: string;
    }>();

    if (!staff) {
      // Check if they have a pending/rejected staff request
      const request = await c.env.DB.prepare(
        'SELECT status FROM staff_requests WHERE line_user_id = ?'
      ).bind(lineUserId).first<{ status: string }>();

      if (request) {
        if (request.status === 'pending') {
          return c.json({ error: t('errors.registrationPending', locale) }, 403);
        }
        if (request.status === 'rejected') {
          return c.json({ error: t('errors.registrationRejected', locale) }, 403);
        }
      }

      return c.json({ error: t('errors.notRegisteredWithRestaurant', locale) }, 403);
    }

    const token = crypto.randomUUID();
    await c.env.CACHE.put(
      `dashboard_session:${token}`,
      JSON.stringify({ restaurantId: staff.restaurant_id, staffName: staff.name, role: staff.role }),
      { expirationTtl: 86400 }
    );

    // Set HttpOnly cookie for SPA auth
    const isProduction = c.env.ENVIRONMENT === 'production';
    const domain = isProduction ? '.lunchef.antu-technology.com' : undefined;
    c.header('Set-Cookie', buildSessionCookie('dashboard_session', token, 86400, domain));

    return c.json({
      success: true,
      restaurant: { id: staff.restaurant_id, name: staff.restaurant_name },
      staff: { name: staff.name, role: staff.role },
    });
  } catch (error) {
    console.error('LINE dashboard login error:', error);
    return c.json({ error: t('errors.loginFailed', locale) }, 500);
  }
});

// POST /api/dashboard/logout
app.post('/logout', async (c) => {
  try {
    const cookieHeader = c.req.header('Cookie') || '';
    const token = parseCookie(cookieHeader, 'dashboard_session');

    if (token) {
      await c.env.CACHE.delete(`dashboard_session:${token}`);
    }

    const isProduction = c.env.ENVIRONMENT === 'production';
    const domain = isProduction ? '.lunchef.antu-technology.com' : undefined;
    c.header('Set-Cookie', buildSessionCookie('dashboard_session', '', 0, domain));

    return c.json({ success: true });
  } catch (error) {
    console.error('Dashboard logout error:', error);
    return c.json({ error: t('errors.logoutFailed', getLocale(c)) }, 500);
  }
});

// All routes below require dashboard auth
app.use('*', dashboardAuthMiddleware);

// GET /api/dashboard/orders
app.get('/orders', async (c) => {
  const restaurantId = c.get('restaurantId');
  const queryParsed = DashboardOrdersQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!queryParsed.success) {
    return c.json({ error: t('errors.invalidQueryParameters', getLocale(c)) }, 400);
  }
  const date = queryParsed.data.date || new Date().toISOString().split('T')[0];

  const { results } = await c.env.DB.prepare(`
    SELECT o.*, c.name as company_name, u.name as user_name, u.phone as user_phone
    FROM orders o
    JOIN companies c ON o.company_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.restaurant_id = ? AND o.order_date = ?
    ORDER BY o.pickup_time, o.created_at
  `).bind(restaurantId, date).all();

  return c.json(results);
});

// GET /api/dashboard/orders/:id
app.get('/orders/:id', async (c) => {
  const locale = getLocale(c);
  const restaurantId = c.get('restaurantId');
  const id = c.req.param('id');

  const order = await c.env.DB.prepare(`
    SELECT o.*, c.name as company_name, c.tax_id, u.name as user_name, u.phone as user_phone
    FROM orders o
    JOIN companies c ON o.company_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ? AND o.restaurant_id = ?
  `).bind(id, restaurantId).first();

  if (!order) return c.json({ error: t('errors.orderNotFound', locale) }, 404);

  const { results: items } = await c.env.DB.prepare(`
    SELECT oi.*, mi.name as menu_item_name
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = ?
  `).bind(id).all();

  return c.json({ ...order, items });
});

// PUT /api/dashboard/orders/:id/status
app.put('/orders/:id/status', async (c) => {
  const locale = getLocale(c);
  try {
    const restaurantId = c.get('restaurantId');
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateOrderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: t('errors.invalidInput', locale), details: parsed.error.issues }, 400);
    }
    const { status, cancellation_reason } = parsed.data;

    // Verify order belongs to this restaurant
    const orderCheck = await c.env.DB.prepare(
      'SELECT id FROM orders WHERE id = ? AND restaurant_id = ?'
    ).bind(id, restaurantId).first();

    if (!orderCheck) {
      return c.json({ error: t('errors.orderNotFound', locale) }, 404);
    }

    const result = await c.env.DB.prepare(`
      UPDATE orders
      SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND restaurant_id = ?
    `).bind(status, cancellation_reason || null, id, restaurantId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: t('errors.orderNotFound', locale) }, 404);
    }

    // Send LINE notification to customer on status update
    try {
      const order = await c.env.DB.prepare(`
        SELECT o.order_number, o.pickup_time, r.name as restaurant_name, u.line_user_id
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `).bind(id).first<{
        order_number: string;
        pickup_time: string;
        line_user_id: string;
        restaurant_name: string;
      }>();

      if (order?.line_user_id) {
        const statusMessage = createStatusUpdateFlex({
          orderNumber: order.order_number,
          status,
          restaurantName: order.restaurant_name,
          pickupTime: order.pickup_time,
          cancellationReason: cancellation_reason ?? undefined,
        });
        await sendLineMessage(c.env, order.line_user_id, [statusMessage]);
      }
    } catch (notifyError) {
      console.error('Failed to send status notification:', notifyError);
    }

    return c.json({ success: true, status });
  } catch (error) {
    console.error('Update status error:', error);
    return c.json({ error: t('errors.updateFailed', locale) }, 500);
  }
});

// GET /api/dashboard/stats
app.get('/stats', async (c) => {
  const restaurantId = c.get('restaurantId');
  const queryParsed = DateQuerySchema.safeParse(Object.fromEntries(new URL(c.req.url).searchParams));
  if (!queryParsed.success) {
    return c.json({ error: t('errors.invalidQueryParameters', getLocale(c)) }, 400);
  }
  const date = queryParsed.data.date || new Date().toISOString().split('T')[0];

  const stats = await c.env.DB.prepare(`
    SELECT
      COUNT(*) as total_orders,
      SUM(total_amount) as total_revenue,
      COUNT(CASE WHEN status = 'pending' THEN 1 END) as pending_orders,
      COUNT(CASE WHEN status = 'confirmed' THEN 1 END) as confirmed_orders,
      COUNT(CASE WHEN status = 'preparing' THEN 1 END) as preparing_orders,
      COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed_orders,
      COUNT(CASE WHEN status = 'cancelled' THEN 1 END) as cancelled_orders
    FROM orders
    WHERE restaurant_id = ? AND order_date = ?
  `).bind(restaurantId, date).first();

  return c.json(stats);
});

export default app;
