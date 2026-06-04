import { Hono } from 'hono';
import type { Env } from '../index';
import { dashboardAuthMiddleware } from '../middleware/auth';
import { sendLineMessage, createStatusUpdateFlex } from '../utils/line';

const app = new Hono<{
  Bindings: Env;
  Variables: { restaurantId: number };
}>();

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'arrived', 'completed', 'cancelled'];

// POST /api/dashboard/line-login — authenticate staff via LINE
app.post('/line-login', async (c) => {
  try {
    const { access_token } = await c.req.json<{ access_token?: string }>();

    if (!access_token) {
      return c.json({ error: 'access_token required' }, 400);
    }

    // Verify token with LINE Profile API
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${access_token}` },
    });

    if (!profileRes.ok) {
      return c.json({ error: 'Invalid LINE token' }, 401);
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
      return c.json({ error: 'Your LINE account is not registered with any restaurant. Please contact your admin.' }, 403);
    }

    const token = crypto.randomUUID();
    await c.env.CACHE.put(
      `dashboard_session:${token}`,
      JSON.stringify({ restaurantId: staff.restaurant_id, staffName: staff.name, role: staff.role }),
      { expirationTtl: 86400 }
    );

    return c.json({
      success: true,
      token,
      restaurant: { id: staff.restaurant_id, name: staff.restaurant_name },
      staff: { name: staff.name, role: staff.role },
    });
  } catch (error) {
    console.error('LINE dashboard login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// All routes below require dashboard auth
app.use('*', dashboardAuthMiddleware);

// GET /api/dashboard/orders
app.get('/orders', async (c) => {
  const restaurantId = c.get('restaurantId');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

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
  const restaurantId = c.get('restaurantId');
  const id = c.req.param('id');

  const order = await c.env.DB.prepare(`
    SELECT o.*, c.name as company_name, c.tax_id, u.name as user_name, u.phone as user_phone
    FROM orders o
    JOIN companies c ON o.company_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ? AND o.restaurant_id = ?
  `).bind(id, restaurantId).first();

  if (!order) return c.json({ error: 'Order not found' }, 404);

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
  try {
    const restaurantId = c.get('restaurantId');
    const id = c.req.param('id');
    const body = await c.req.json<{ status: string; cancellation_reason?: string }>();
    const { status, cancellation_reason } = body;

    if (!VALID_STATUSES.includes(status)) {
      return c.json({ error: 'Invalid status' }, 400);
    }

    // Verify order belongs to this restaurant
    const orderCheck = await c.env.DB.prepare(
      'SELECT id FROM orders WHERE id = ? AND restaurant_id = ?'
    ).bind(id, restaurantId).first();

    if (!orderCheck) {
      return c.json({ error: 'Order not found' }, 404);
    }

    const result = await c.env.DB.prepare(`
      UPDATE orders
      SET status = ?, cancellation_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND restaurant_id = ?
    `).bind(status, cancellation_reason || null, id, restaurantId).run();

    if (result.meta.changes === 0) {
      return c.json({ error: 'Order not found' }, 404);
    }

    // Send LINE Bot notification to customer on status update
    try {
      const order = await c.env.DB.prepare(`
        SELECT o.order_number, r.name as restaurant_name, u.line_user_id
        FROM orders o
        JOIN restaurants r ON o.restaurant_id = r.id
        JOIN users u ON o.user_id = u.id
        WHERE o.id = ?
      `).bind(id).first<{
        order_number: string;
        line_user_id: string;
        restaurant_name: string;
      }>();

      if (order?.line_user_id) {
        const statusMessage = createStatusUpdateFlex(
          order.order_number,
          status,
          order.restaurant_name
        );
        await sendLineMessage(c.env, order.line_user_id, [statusMessage]);
      }
    } catch (notifyError) {
      console.error('Failed to send status notification:', notifyError);
    }

    return c.json({ success: true, status });
  } catch (error) {
    console.error('Update status error:', error);
    return c.json({ error: 'Failed to update status' }, 500);
  }
});

// GET /api/dashboard/stats
app.get('/stats', async (c) => {
  const restaurantId = c.get('restaurantId');
  const date = c.req.query('date') || new Date().toISOString().split('T')[0];

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
