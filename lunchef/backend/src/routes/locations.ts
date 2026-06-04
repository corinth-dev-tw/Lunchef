import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Get all active locations
app.get('/', async (c) => {
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM locations WHERE is_active = 1 ORDER BY name'
  ).all();
  return c.json(results);
});

// Get single location
app.get('/:id', async (c) => {
  const id = c.req.param('id');
  const location = await c.env.DB.prepare(
    'SELECT * FROM locations WHERE id = ? AND is_active = 1'
  ).bind(id).first();
  
  if (!location) return c.json({ error: 'Location not found' }, 404);
  return c.json(location);
});

export default app;