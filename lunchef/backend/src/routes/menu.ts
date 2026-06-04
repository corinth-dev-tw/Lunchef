import { Hono } from 'hono';
import type { Env } from '../index';

const app = new Hono<{ Bindings: Env }>();

// Get menu items for a restaurant
app.get('/', async (c) => {
  const restaurantId = c.req.query('restaurant_id');
  
  if (!restaurantId) {
    return c.json({ error: 'restaurant_id required' }, 400);
  }
  
  const { results } = await c.env.DB.prepare(
    'SELECT * FROM menu_items WHERE restaurant_id = ? AND available = 1 ORDER BY category, name'
  ).bind(restaurantId).all();
  
  return c.json(results);
});

export default app;