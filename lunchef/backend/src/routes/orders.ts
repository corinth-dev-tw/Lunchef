import { Hono } from 'hono';
import type { Env } from '../index';
import type { LineUser } from '../index';
import { lineAuthMiddleware } from '../middleware/auth';
import { sendLineMessage, createOrderNotificationFlex } from '../utils/line';
import { CreateOrderSchema } from '../lib/validation';
import { t, getLocale } from '../i18n';

const app = new Hono<{
  Bindings: Env;
  Variables: { user: LineUser };
}>();

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'arrived', 'completed', 'cancelled'];

interface OrderItemInput {
  menu_item_id: number;
  quantity: number;
  special_requests?: string;
}

interface CreateOrderBody {
  company_id: number;
  user_id: number;
  restaurant_id: number;
  location_id: number;
  pickup_time: string;
  order_date: string;
  items: OrderItemInput[];
  payment_method?: string;
  company_name?: string;
  tax_id?: string;
}

function getTaipeiDateParts(): { dateStr: string; hours: number; minutes: number } {
  const now = new Date();
  const taipei = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Taipei' }));
  const dateStr = taipei.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' });
  return {
    dateStr,
    hours: taipei.getHours(),
    minutes: taipei.getMinutes(),
  };
}

function generateOrderNumber(): string {
  const { dateStr } = getTaipeiDateParts();
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, '0')
    .slice(0, 4);
  return `LCE-${dateStr}-${random}`;
}

// GET /api/orders — list orders for authenticated user's company
app.get('/', lineAuthMiddleware, async (c) => {
  const user = c.get('user');
  const companyId = c.req.query('company_id');
  const userId = c.req.query('user_id');
  const locale = getLocale(c);

  // Verify the authenticated user matches the requested user_id or belongs to the company
  const authedUser = await c.env.DB.prepare(
    'SELECT id, company_id FROM users WHERE line_user_id = ? AND is_active = 1'
  ).bind(user.lineUserId).first<{ id: number; company_id: number }>();

  if (!authedUser) {
    return c.json({ error: t('errors.userNotFound', locale) }, 404);
  }

  let query = `
    SELECT o.*, r.name as restaurant_name, l.name as location_name
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    JOIN locations l ON o.location_id = l.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  // Enforce authorization: users can only see their own company's orders
  if (companyId) {
    // Verify the authenticated user belongs to this company
    if (authedUser.company_id !== parseInt(companyId)) {
      return c.json({ error: t('errors.companyMismatch', locale) }, 403);
    }
    query += ' AND o.company_id = ?';
    params.push(companyId);
  } else {
    // Default to authenticated user's company
    query += ' AND o.company_id = ?';
    params.push(authedUser.company_id);
  }

  if (userId) {
    query += ' AND o.user_id = ?';
    params.push(parseInt(userId));
  }

  query += ' ORDER BY o.created_at DESC LIMIT 100';

  const stmt = c.env.DB.prepare(query);
  const { results } = params.length > 0
    ? await stmt.bind(...params).all()
    : await stmt.all();

  return c.json(results);
});

// GET /api/orders/:id — get single order (must belong to user's company)
app.get('/:id', lineAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  const locale = getLocale(c);

  const authedUser = await c.env.DB.prepare(
    'SELECT company_id FROM users WHERE line_user_id = ? AND is_active = 1'
  ).bind(user.lineUserId).first<{ company_id: number }>();

  if (!authedUser) {
    return c.json({ error: t('errors.userNotFound', locale) }, 404);
  }

  const order = await c.env.DB.prepare(`
    SELECT o.*, r.name as restaurant_name, l.name as location_name,
           c.name as registered_company_name, u.name as user_name
    FROM orders o
    JOIN restaurants r ON o.restaurant_id = r.id
    JOIN locations l ON o.location_id = l.id
    JOIN companies c ON o.company_id = c.id
    JOIN users u ON o.user_id = u.id
    WHERE o.id = ?
  `).bind(id).first<{
    company_id: number;
    [key: string]: any;
  }>();

  if (!order) return c.json({ error: t('errors.orderNotFound', locale) }, 404);

  // Authorization check
  if (order.company_id !== authedUser.company_id) {
    return c.json({ error: t('errors.forbidden', locale) }, 403);
  }

  const { results: items } = await c.env.DB.prepare(`
    SELECT oi.*, mi.name as menu_item_name
    FROM order_items oi
    JOIN menu_items mi ON oi.menu_item_id = mi.id
    WHERE oi.order_id = ?
  `).bind(id).all();

  return c.json({ ...order, items });
});

// POST /api/orders — create order (authenticated)
app.post('/', lineAuthMiddleware, async (c) => {
  try {
    const user = c.get('user');
    const locale = getLocale(c);
    const body = await c.req.json();
    const parsed = CreateOrderSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: t('errors.invalidInput', locale), details: parsed.error.issues }, 400);
    }
    const {
      company_id,
      user_id,
      restaurant_id,
      location_id,
      pickup_time,
      order_date,
      items,
      payment_method,
      company_name,
      tax_id,
    } = parsed.data;

    // Verify authenticated user matches the order's user_id and company_id
    const authedUser = await c.env.DB.prepare(
      'SELECT id, company_id FROM users WHERE line_user_id = ? AND is_active = 1'
    ).bind(user.lineUserId).first<{ id: number; company_id: number }>();

    if (!authedUser) {
      return c.json({ error: t('errors.userNotFound', locale) }, 404);
    }

    if (authedUser.id !== user_id || authedUser.company_id !== company_id) {
      return c.json({ error: t('errors.forbidden', locale) }, 403);
    }

    // Get restaurant info
    const restaurant = await c.env.DB.prepare(
      'SELECT * FROM restaurants WHERE id = ? AND is_active = 1'
    ).bind(restaurant_id).first<{
      id: number;
      name: string;
      order_cutoff_time: string;
      min_order_type: string;
      min_order_value: number;
    }>();

    if (!restaurant) {
      return c.json({ error: t('errors.restaurantNotFound', locale) }, 404);
    }

    // Check cutoff time (timezone-aware, Asia/Taipei)
    const taipei = getTaipeiDateParts();
    if (order_date === taipei.dateStr) {
      const [cutoffHour, cutoffMinute] = restaurant.order_cutoff_time.split(':').map(Number);
      const currentMinutes = taipei.hours * 60 + taipei.minutes;
      const cutoffMinutes = cutoffHour * 60 + cutoffMinute;

      if (currentMinutes >= cutoffMinutes) {
        return c.json({ error: t('errors.cutoffPassed', locale, { time: restaurant.order_cutoff_time }) }, 400);
      }
    }

    // Calculate total and validate min order
    let totalAmount = 0;
    let totalItems = 0;
    const validatedItems: Array<{
      menu_item_id: number;
      quantity: number;
      unit_price: number;
      special_requests: string | null;
    }> = [];

    for (const item of items) {
      const menuItem = await c.env.DB.prepare(
        'SELECT id, price, available FROM menu_items WHERE id = ? AND restaurant_id = ?'
      ).bind(item.menu_item_id, restaurant_id).first<{ id: number; price: number; available: number }>();

      if (!menuItem) {
        return c.json({ error: t('errors.menuItemNotFound', locale, { id: item.menu_item_id }) }, 400);
      }

      if (!menuItem.available) {
        return c.json({ error: t('errors.menuItemUnavailable', locale, { id: item.menu_item_id }) }, 400);
      }

      totalAmount += menuItem.price * item.quantity;
      totalItems += item.quantity;
      validatedItems.push({
        menu_item_id: item.menu_item_id,
        quantity: item.quantity,
        unit_price: menuItem.price,
        special_requests: item.special_requests || null,
      });
    }

    // Validate minimum order
    if (restaurant.min_order_type === 'items' && totalItems < restaurant.min_order_value) {
      return c.json({
        error: `Minimum order is ${restaurant.min_order_value} items. You have ${totalItems}.`,
      }, 400);
    }

    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value) {
      return c.json({
        error: `Minimum order is $${restaurant.min_order_value}. Your total is $${totalAmount}.`,
      }, 400);
    }

    // Generate unique order number (race-condition free)
    let orderNumber = generateOrderNumber();
    let attempts = 0;
    const maxAttempts = 5;

    while (attempts < maxAttempts) {
      const existing = await c.env.DB.prepare(
        'SELECT id FROM orders WHERE order_number = ?'
      ).bind(orderNumber).first();

      if (!existing) break;
      orderNumber = generateOrderNumber();
      attempts++;
    }

    if (attempts >= maxAttempts) {
      return c.json({ error: t('errors.orderNumberGenerationFailed', locale) }, 500);
    }

    // Create order first, then items (reliable last_row_id retrieval)
    const orderResult = await c.env.DB.prepare(`
      INSERT INTO orders (order_number, company_id, user_id, restaurant_id, location_id, pickup_time, order_date, total_amount, status, payment_method, company_name, tax_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?, ?)
    `).bind(orderNumber, company_id, user_id, restaurant_id, location_id, pickup_time, order_date, totalAmount, payment_method || 'cash', company_name || null, tax_id || null).run();

    const orderId = orderResult.meta?.last_row_id;

    if (!orderId) {
      console.error('Order insert failed: no last_row_id', { orderResult });
      return c.json({ error: t('errors.orderCreationFailed', locale) }, 500);
    }

    // Insert order items
    if (validatedItems.length > 0) {
      const itemStmts = validatedItems.map((item) =>
        c.env.DB.prepare(`
          INSERT INTO order_items (order_id, menu_item_id, quantity, unit_price, special_requests)
          VALUES (?, ?, ?, ?, ?)
        `).bind(orderId, item.menu_item_id, item.quantity, item.unit_price, item.special_requests)
      );
      await c.env.DB.batch(itemStmts);
    }

    // Send LINE Bot notification to restaurant
    try {
      const company = await c.env.DB.prepare(
        'SELECT name FROM companies WHERE id = ?'
      ).bind(company_id).first<{ name: string }>();

      const notificationMessage = createOrderNotificationFlex(
        orderNumber,
        company_name || company?.name || t('errors.notFound', 'zh-TW'),
        totalAmount,
        pickup_time,
        totalItems
      );

      // For demo, send to configured admin; in production this should go to restaurant's LINE ID
      const adminLineId = await c.env.CACHE.get('admin_line_id');
      if (adminLineId) {
        await sendLineMessage(c.env, adminLineId, [notificationMessage]);
      }
    } catch (notifyError) {
      console.error('Failed to send notification:', notifyError);
      // Don't fail the order if notification fails
    }

    return c.json({
      success: true,
      order_id: orderId,
      order_number: orderNumber,
      total_amount: totalAmount,
      total_items: totalItems,
      status: 'pending',
    }, 201);
  } catch (error: any) {
    console.error('Create order error:', error);
    return c.json({ error: t('errors.orderCreationFailed', getLocale(c)) }, 500);
  }
});

export default app;
