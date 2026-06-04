import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Get restaurants available for a location (or all active restaurants if no location_id)
app.get('/', async (c) => {
  const locationId = c.req.query('location_id');
  
  if (!locationId) {
    // Public listing for dashboard login — return only id and name
    const { results } = await c.env.DB.prepare(
      'SELECT id, name FROM restaurants WHERE is_active = 1 ORDER BY name'
    ).all();
    return c.json(results);
  }
  
  const { results } = await c.env.DB.prepare(`
    SELECT r.* FROM restaurants r
    JOIN restaurant_locations rl ON r.id = rl.restaurant_id
    WHERE rl.location_id = ? AND rl.is_available = 1 AND r.is_active = 1
    ORDER BY r.name
  `).bind(locationId).all();
  
  return c.json(results);
});

// Get single restaurant with pickup times
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  
  const restaurant = await c.env.DB.prepare(
    'SELECT * FROM restaurants WHERE id = ? AND is_active = 1'
  ).bind(id).first();
  
  if (!restaurant) return c.json({ error: 'Restaurant not found' }, 404);
  
  const { results: pickupTimes } = await c.env.DB.prepare(
    'SELECT time_slot FROM pickup_times WHERE restaurant_id = ? ORDER BY time_slot'
  ).bind(id).all();
  
  return c.json({
    ...restaurant,
    pickup_times: pickupTimes.map(t => t.time_slot)
  });
});

export default app;