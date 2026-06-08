import { Hono } from 'hono';
import type { Env } from '../index';
import {
  CreateRestaurantSchema,
  UpdateRestaurantSchema,
  CreateLocationSchema,
  UpdateLocationSchema,
  CreateMenuItemSchema,
  UpdateMenuItemSchema,
  ApproveStaffRequestSchema,
  AddStaffSchema,
  UpdateStaffSchema,
  AdminLoginSchema,
} from '../lib/validation';

const app = new Hono<{ Bindings: Env }>();

// Admin auth middleware
app.use('*', async (c, next) => {
  // Skip auth for login endpoints
  const skipPaths = ['/login', '/api/admin/login', '/line-login', '/api/admin/line-login'];
  if (skipPaths.includes(c.req.path) && c.req.method === 'POST') {
    return next();
  }

  // Try cookie first, fall back to Authorization header
  const cookie = c.req.header('Cookie') || '';
  const cookieMatch = cookie.match(/admin_session=([^;]+)/);
  let token = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;

  if (!token) {
    const authHeader = c.req.header('Authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.slice(7);
    }
  }

  if (!token) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const session = await c.env.CACHE.get(`admin_session:${token}`);

  if (!session) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  return next();
});

// POST /api/admin/login
app.post('/login', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = AdminLoginSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { password } = parsed.data;
    const adminPassword = c.env.ADMIN_PASSWORD;

    if (!adminPassword) {
      return c.json({ error: 'Admin not configured' }, 500);
    }

    if (!password) {
      return c.json({ error: 'Password required' }, 400);
    }

    if (password !== adminPassword) {
      return c.json({ error: 'Invalid password' }, 401);
    }

    const token = crypto.randomUUID();
    await c.env.CACHE.put(
      `admin_session:${token}`,
      JSON.stringify({ role: 'admin' }),
      { expirationTtl: 28800 }  // 8 hours
    );

    // Set HttpOnly cookie for SPA auth
    const isProduction = c.env.ENVIRONMENT === 'production';
    c.header('Set-Cookie',
      `admin_session=${token}; HttpOnly; Secure; SameSite=None; Max-Age=28800; Path=/; ${isProduction ? 'Domain=.lunchef.antu-technology.com;' : ''}`
    );

    return c.json({ success: true, token });
  } catch (error) {
    console.error('Admin login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// POST /api/admin/line-login — verify LINE token and check admin LINE user ID
app.post('/line-login', async (c) => {
  try {
    const body = await c.req.json();
    const accessToken = body.access_token as string | undefined;
    if (!accessToken) {
      return c.json({ error: 'access_token required' }, 400);
    }

    // Verify token with LINE
    const profileRes = await fetch('https://api.line.me/v2/profile', {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!profileRes.ok) {
      return c.json({ error: 'Invalid LINE token' }, 401);
    }
    const profile = await profileRes.json() as { userId: string; displayName: string };

    // Check if this LINE user is the designated admin
    const adminLineUserId = c.env.ADMIN_LINE_USER_ID;
    if (!adminLineUserId) {
      return c.json({ error: 'Admin not configured' }, 500);
    }
    if (profile.userId !== adminLineUserId) {
      return c.json({ error: 'Not authorised as admin' }, 403);
    }

    // Create session
    const token = crypto.randomUUID();
    await c.env.CACHE.put(
      `admin_session:${token}`,
      JSON.stringify({ role: 'admin', lineUserId: profile.userId, name: profile.displayName }),
      { expirationTtl: 28800 }
    );

    const isProduction = c.env.ENVIRONMENT === 'production';
    c.header('Set-Cookie',
      `admin_session=${token}; HttpOnly; Secure; SameSite=None; Max-Age=28800; Path=/; ${isProduction ? 'Domain=.lunchef.antu-technology.com;' : ''}`
    );

    return c.json({ success: true, token, name: profile.displayName });
  } catch (error) {
    console.error('Admin LINE login error:', error);
    return c.json({ error: 'Login failed' }, 500);
  }
});

// GET /api/admin/restaurants
app.get('/restaurants', async (c) => {
  const { results } = await c.env.DB.prepare(`
    SELECT r.*, GROUP_CONCAT(rl.location_id) as location_ids
    FROM restaurants r
    LEFT JOIN restaurant_locations rl ON r.id = rl.restaurant_id AND rl.is_available = 1
    WHERE r.is_active = 1
    GROUP BY r.id
    ORDER BY r.name
  `).all();

  return c.json(results);
});

// GET /api/admin/restaurants/:id
app.get('/restaurants/:id', async (c) => {
  const id = c.req.param('id');

  const restaurant = await c.env.DB.prepare(
    'SELECT * FROM restaurants WHERE id = ? AND is_active = 1'
  ).bind(id).first();

  if (!restaurant) return c.json({ error: 'Not found' }, 404);

  const { results: locations } = await c.env.DB.prepare(
    'SELECT location_id FROM restaurant_locations WHERE restaurant_id = ? AND is_available = 1'
  ).bind(id).all();

  const { results: pickupTimes } = await c.env.DB.prepare(
    'SELECT time_slot FROM pickup_times WHERE restaurant_id = ? ORDER BY time_slot'
  ).bind(id).all();

  return c.json({
    ...restaurant,
    location_ids: locations.map((l: any) => l.location_id),
    pickup_times: pickupTimes.map((t: any) => t.time_slot),
  });
});

// POST /api/admin/restaurants
app.post('/restaurants', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = CreateRestaurantSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const {
      name, cuisine_type, department_store, floor, phone, image_url,
      order_cutoff_time, min_order_type, min_order_value, location_ids, pickup_times
    } = parsed.data;

    const result = await c.env.DB.prepare(`
      INSERT INTO restaurants
      (name, cuisine_type, department_store, floor, phone, image_url, order_cutoff_time, min_order_type, min_order_value)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, cuisine_type || 'asian', department_store, floor || '', phone || '',
      image_url || '', order_cutoff_time || '09:00', min_order_type || 'items',
      min_order_value || 10
    ).run();

    const restaurantId = result.meta?.last_row_id;

    // Assign locations
    if (location_ids && location_ids.length > 0 && restaurantId) {
      for (const locId of location_ids) {
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO restaurant_locations (restaurant_id, location_id, is_available) VALUES (?, ?, 1)'
        ).bind(restaurantId, locId).run();
      }
    }

    // Add pickup times
    if (pickup_times && pickup_times.length > 0 && restaurantId) {
      for (const time of pickup_times) {
        await c.env.DB.prepare(
          'INSERT INTO pickup_times (restaurant_id, time_slot) VALUES (?, ?)'
        ).bind(restaurantId, time).run();
      }
    }

    return c.json({ success: true, id: restaurantId }, 201);
  } catch (error) {
    console.error('Create restaurant error:', error);
    return c.json({ error: 'Failed to create restaurant' }, 500);
  }
});

// PUT /api/admin/restaurants/:id
app.put('/restaurants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateRestaurantSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const {
      name, cuisine_type, department_store, floor, phone, image_url,
      order_cutoff_time, min_order_type, min_order_value, location_ids, pickup_times
    } = parsed.data;

    await c.env.DB.prepare(`
      UPDATE restaurants SET
        name = ?, cuisine_type = ?, department_store = ?, floor = ?,
        phone = ?, image_url = ?, order_cutoff_time = ?, min_order_type = ?, min_order_value = ?
      WHERE id = ?
    `).bind(
      name, cuisine_type, department_store, floor, phone || '',
      image_url || '', order_cutoff_time, min_order_type, min_order_value, id
    ).run();

    // Update locations: remove old, add new
    if (location_ids) {
      await c.env.DB.prepare(
        'UPDATE restaurant_locations SET is_available = 0 WHERE restaurant_id = ?'
      ).bind(id).run();

      for (const locId of location_ids) {
        await c.env.DB.prepare(
          'INSERT OR REPLACE INTO restaurant_locations (restaurant_id, location_id, is_available) VALUES (?, ?, 1)'
        ).bind(id, locId).run();
      }
    }

    // Update pickup times if provided
    if (pickup_times) {
      await c.env.DB.prepare(
        'DELETE FROM pickup_times WHERE restaurant_id = ?'
      ).bind(id).run();

      for (const time of pickup_times) {
        await c.env.DB.prepare(
          'INSERT INTO pickup_times (restaurant_id, time_slot) VALUES (?, ?)'
        ).bind(id, time).run();
      }
    }

    return c.json({ success: true });
  } catch (error) {
    console.error('Update restaurant error:', error);
    return c.json({ error: 'Failed to update restaurant' }, 500);
  }
});

// DELETE /api/admin/restaurants/:id (soft delete)
app.delete('/restaurants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE restaurants SET is_active = 0 WHERE id = ?'
    ).bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete restaurant error:', error);
    return c.json({ error: 'Failed to delete restaurant' }, 500);
  }
});

// GET /api/admin/locations
app.get('/locations', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, address FROM locations WHERE is_active = 1 ORDER BY name'
  ).all();
  return c.json(results);
});

// POST /api/admin/locations
app.post('/locations', async (c) => {
  try {
    const body = await c.req.json();
    const parsed = CreateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { name, address } = parsed.data;
    const result = await c.env.DB.prepare(
      'INSERT INTO locations (name, address) VALUES (?, ?)'
    ).bind(name, address || '').run();
    return c.json({ success: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    console.error('Create location error:', error);
    return c.json({ error: 'Failed to create location' }, 500);
  }
});

// PUT /api/admin/locations/:id
app.put('/locations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateLocationSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { name, address } = parsed.data;
    await c.env.DB.prepare(
      'UPDATE locations SET name = ?, address = ? WHERE id = ?'
    ).bind(name, address || '', id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Update location error:', error);
    return c.json({ error: 'Failed to update location' }, 500);
  }
});

// DELETE /api/admin/locations/:id (soft delete)
app.delete('/locations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE locations SET is_active = 0 WHERE id = ?'
    ).bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete location error:', error);
    return c.json({ error: 'Failed to delete location' }, 500);
  }
});

// === STAFF MANAGEMENT ===

// GET /api/admin/restaurants/:id/staff
app.get('/restaurants/:id/staff', async (c) => {
  try {
    const restaurantId = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT id, restaurant_id, line_user_id, name, role, is_active, created_at FROM restaurant_staff WHERE restaurant_id = ? ORDER BY created_at'
    ).bind(restaurantId).all();
    return c.json(results);
  } catch (error) {
    console.error('Get staff error:', error);
    return c.json({ error: 'Failed to get staff' }, 500);
  }
});

// POST /api/admin/restaurants/:id/staff
app.post('/restaurants/:id/staff', async (c) => {
  try {
    const restaurantId = c.req.param('id');
    const body = await c.req.json();
    const parsed = AddStaffSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { line_user_id, name, role } = parsed.data;

    const result = await c.env.DB.prepare(
      'INSERT INTO restaurant_staff (restaurant_id, line_user_id, name, role) VALUES (?, ?, ?, ?)'
    ).bind(restaurantId, line_user_id, name, role || 'staff').run();

    return c.json({ success: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    console.error('Add staff error:', error);
    return c.json({ error: 'Failed to add staff' }, 500);
  }
});

// PUT /api/admin/staff/:id
app.put('/staff/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateStaffSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { name, role, is_active } = parsed.data;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (role !== undefined) { updates.push('role = ?'); values.push(role); }
    if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active); }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    values.push(id);
    await c.env.DB.prepare(
      `UPDATE restaurant_staff SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update staff error:', error);
    return c.json({ error: 'Failed to update staff' }, 500);
  }
});

// DELETE /api/admin/staff/:id
app.delete('/staff/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare('DELETE FROM restaurant_staff WHERE id = ?').bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete staff error:', error);
    return c.json({ error: 'Failed to delete staff' }, 500);
  }
});

// === MENU MANAGEMENT ===

// GET /api/admin/restaurants/:id/menu
app.get('/restaurants/:id/menu', async (c) => {
  try {
    const restaurantId = c.req.param('id');
    const { results } = await c.env.DB.prepare(
      'SELECT id, restaurant_id, name, description, price, category, image_url, available, created_at FROM menu_items WHERE restaurant_id = ? ORDER BY category, name'
    ).bind(restaurantId).all();
    return c.json(results);
  } catch (error) {
    console.error('Get menu error:', error);
    return c.json({ error: 'Failed to get menu' }, 500);
  }
});

// POST /api/admin/restaurants/:id/menu
app.post('/restaurants/:id/menu', async (c) => {
  try {
    const restaurantId = c.req.param('id');
    const body = await c.req.json();
    const parsed = CreateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { name, description, price, category, image_url } = parsed.data;

    const result = await c.env.DB.prepare(
      'INSERT INTO menu_items (restaurant_id, name, description, price, category, image_url) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(restaurantId, name, description || '', price, category || 'main', image_url || '').run();

    return c.json({ success: true, id: result.meta?.last_row_id }, 201);
  } catch (error) {
    console.error('Add menu item error:', error);
    return c.json({ error: 'Failed to add menu item' }, 500);
  }
});

// PUT /api/admin/menu/:id
app.put('/menu/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = UpdateMenuItemSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { name, description, price, category, image_url, available } = parsed.data;

    const updates: string[] = [];
    const values: any[] = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (description !== undefined) { updates.push('description = ?'); values.push(description); }
    if (price !== undefined) { updates.push('price = ?'); values.push(price); }
    if (category !== undefined) { updates.push('category = ?'); values.push(category); }
    if (image_url !== undefined) { updates.push('image_url = ?'); values.push(image_url); }
    if (available !== undefined) { updates.push('available = ?'); values.push(available); }

    if (updates.length === 0) {
      return c.json({ error: 'No fields to update' }, 400);
    }

    values.push(id);
    await c.env.DB.prepare(
      `UPDATE menu_items SET ${updates.join(', ')} WHERE id = ?`
    ).bind(...values).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Update menu item error:', error);
    return c.json({ error: 'Failed to update menu item' }, 500);
  }
});

// DELETE /api/admin/menu/:id (soft delete via available=0)
app.delete('/menu/:id', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE menu_items SET available = 0 WHERE id = ?'
    ).bind(id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Delete menu item error:', error);
    return c.json({ error: 'Failed to delete menu item' }, 500);
  }
});

// === GLOBAL ORDER OVERVIEW ===

// GET /api/admin/orders
app.get('/orders', async (c) => {
  try {
    const date = c.req.query('date');
    const restaurantId = c.req.query('restaurant_id');
    const status = c.req.query('status');

    let sql = `
      SELECT
        o.id, o.order_number, o.pickup_time, o.order_date, o.total_amount, o.status, o.payment_method, o.created_at,
        r.name as restaurant_name,
        c.name as company_name,
        l.name as location_name
      FROM orders o
      JOIN restaurants r ON o.restaurant_id = r.id
      JOIN companies c ON o.company_id = c.id
      JOIN locations l ON o.location_id = l.id
      WHERE 1=1
    `;
    const params: any[] = [];

    if (date) {
      sql += ' AND o.order_date = ?';
      params.push(date);
    }
    if (restaurantId) {
      sql += ' AND o.restaurant_id = ?';
      params.push(restaurantId);
    }
    if (status) {
      sql += ' AND o.status = ?';
      params.push(status);
    }

    sql += ' ORDER BY o.created_at DESC';

    const stmt = c.env.DB.prepare(sql);
    const { results } = params.length > 0 ? await stmt.bind(...params).all() : await stmt.all();
    return c.json(results);
  } catch (error) {
    console.error('Get orders error:', error);
    return c.json({ error: 'Failed to get orders' }, 500);
  }
});

// === ANALYTICS ===

// GET /api/admin/analytics/summary
app.get('/analytics/summary', async (c) => {
  try {
    const date = c.req.query('date') || new Date().toISOString().split('T')[0];

    // Total orders and revenue for the date
    const orderStats = await c.env.DB.prepare(
      `SELECT COUNT(*) as total_orders, COALESCE(SUM(total_amount), 0) as total_revenue
       FROM orders WHERE order_date = ?`
    ).bind(date).first<{ total_orders: number; total_revenue: number }>();

    // Orders by restaurant
    const { results: byRestaurant } = await c.env.DB.prepare(
      `SELECT r.name as restaurant_name, COUNT(*) as order_count, COALESCE(SUM(o.total_amount), 0) as revenue
       FROM orders o
       JOIN restaurants r ON o.restaurant_id = r.id
       WHERE o.order_date = ?
       GROUP BY o.restaurant_id
       ORDER BY order_count DESC`
    ).bind(date).all();

    // Orders by status
    const { results: byStatus } = await c.env.DB.prepare(
      `SELECT status, COUNT(*) as count FROM orders WHERE order_date = ? GROUP BY status`
    ).bind(date).all();

    // Active restaurants count
    const restaurantStats = await c.env.DB.prepare(
      'SELECT COUNT(*) as active_restaurants FROM restaurants WHERE is_active = 1'
    ).first<{ active_restaurants: number }>();

    return c.json({
      date,
      total_orders: orderStats?.total_orders || 0,
      total_revenue: orderStats?.total_revenue || 0,
      active_restaurants: restaurantStats?.active_restaurants || 0,
      by_restaurant: byRestaurant,
      by_status: byStatus,
    });
  } catch (error) {
    console.error('Analytics error:', error);
    return c.json({ error: 'Failed to get analytics' }, 500);
  }
});

// === STAFF REQUESTS ===

// GET /api/admin/staff-requests
app.get('/staff-requests', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT sr.*, r.name as restaurant_name
      FROM staff_requests sr
      LEFT JOIN restaurants r ON sr.restaurant_id = r.id
      WHERE sr.status = 'pending'
      ORDER BY sr.requested_at DESC
    `).all();
    return c.json(results);
  } catch (error) {
    console.error('Get staff requests error:', error);
    return c.json({ error: 'Failed to get staff requests' }, 500);
  }
});

// POST /api/admin/staff-requests/:id/approve
app.post('/staff-requests/:id/approve', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json();
    const parsed = ApproveStaffRequestSchema.safeParse(body);
    if (!parsed.success) {
      return c.json({ error: 'Invalid input', details: parsed.error.issues }, 400);
    }
    const { restaurant_id, role } = parsed.data;

    const request = await c.env.DB.prepare(
      'SELECT line_user_id, name FROM staff_requests WHERE id = ?'
    ).bind(id).first<{ line_user_id: string; name: string }>();

    if (!request) {
      return c.json({ error: 'Request not found' }, 404);
    }

    // Create restaurant_staff record
    await c.env.DB.prepare(
      'INSERT OR REPLACE INTO restaurant_staff (restaurant_id, line_user_id, name, role) VALUES (?, ?, ?, ?)'
    ).bind(restaurant_id, request.line_user_id, request.name, role || 'staff').run();

    // Update request status
    await c.env.DB.prepare(
      'UPDATE staff_requests SET status = ?, restaurant_id = ?, role = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('approved', restaurant_id, role || 'staff', id).run();

    return c.json({ success: true });
  } catch (error) {
    console.error('Approve staff request error:', error);
    return c.json({ error: 'Failed to approve request' }, 500);
  }
});

// POST /api/admin/staff-requests/:id/reject
app.post('/staff-requests/:id/reject', async (c) => {
  try {
    const id = c.req.param('id');
    await c.env.DB.prepare(
      'UPDATE staff_requests SET status = ?, processed_at = CURRENT_TIMESTAMP WHERE id = ?'
    ).bind('rejected', id).run();
    return c.json({ success: true });
  } catch (error) {
    console.error('Reject staff request error:', error);
    return c.json({ error: 'Failed to reject request' }, 500);
  }
});

export default app;
