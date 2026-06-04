import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

const VALID_STATUSES = ['pending', 'confirmed', 'preparing', 'arrived', 'completed', 'cancelled'];

// Admin auth middleware
app.use('*', async (c, next) => {
  // Skip auth for login endpoint
  if ((c.req.path === '/login' || c.req.path === '/api/admin/login') && c.req.method === 'POST') {
    return next();
  }

  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  const token = authHeader.slice(7);
  const session = await c.env.CACHE.get(`admin_session:${token}`);

  if (!session) {
    return c.json({ error: 'Invalid or expired token' }, 401);
  }

  return next();
});

// POST /api/admin/login
app.post('/login', async (c) => {
  try {
    const { password } = await c.req.json<{ password?: string }>();
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
      { expirationTtl: 86400 }
    );

    return c.json({ success: true, token });
  } catch (error) {
    console.error('Admin login error:', error);
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
    const body = await c.req.json<any>();
    const {
      name, cuisine_type, department_store, floor, phone, image_url,
      order_cutoff_time, min_order_type, min_order_value, location_ids, pickup_times
    } = body;

    if (!name || !department_store) {
      return c.json({ error: 'name and department_store are required' }, 400);
    }

    const apiKey = generateApiKey();

    const result = await c.env.DB.prepare(`
      INSERT INTO restaurants
      (name, cuisine_type, department_store, floor, phone, image_url, order_cutoff_time, min_order_type, min_order_value, api_key)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).bind(
      name, cuisine_type || 'asian', department_store, floor || '', phone || '',
      image_url || '', order_cutoff_time || '09:00', min_order_type || 'items',
      min_order_value || 10, apiKey
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

    return c.json({ success: true, id: restaurantId, api_key: apiKey }, 201);
  } catch (error) {
    console.error('Create restaurant error:', error);
    return c.json({ error: 'Failed to create restaurant' }, 500);
  }
});

// PUT /api/admin/restaurants/:id
app.put('/restaurants/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const body = await c.req.json<any>();
    const {
      name, cuisine_type, department_store, floor, phone, image_url,
      order_cutoff_time, min_order_type, min_order_value, location_ids, pickup_times
    } = body;

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

// POST /api/admin/restaurants/:id/regenerate-key
app.post('/restaurants/:id/regenerate-key', async (c) => {
  try {
    const id = c.req.param('id');
    const newKey = generateApiKey();
    await c.env.DB.prepare(
      'UPDATE restaurants SET api_key = ? WHERE id = ?'
    ).bind(newKey, id).run();
    return c.json({ success: true, api_key: newKey });
  } catch (error) {
    console.error('Regenerate key error:', error);
    return c.json({ error: 'Failed to regenerate key' }, 500);
  }
});

// GET /api/admin/locations
app.get('/locations', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT id, name, address FROM locations WHERE is_active = 1 ORDER BY name'
  ).all();
  return c.json(results);
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
    const { line_user_id, name, role } = await c.req.json<{ line_user_id?: string; name?: string; role?: string }>();

    if (!line_user_id || !name) {
      return c.json({ error: 'line_user_id and name are required' }, 400);
    }

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
    const { name, role, is_active } = await c.req.json<{ name?: string; role?: string; is_active?: number }>();

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

function generateApiKey(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 16; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export default app;
