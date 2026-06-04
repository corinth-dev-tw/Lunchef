import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import locationsRoutes from './routes/locations';
import restaurantsRoutes from './routes/restaurants';
import ordersRoutes from './routes/orders';
import usersRoutes from './routes/users';
import menuRoutes from './routes/menu';
import dashboardRoutes from './routes/dashboard';
import webhookRoutes from './routes/webhook';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
}

export interface LineUser {
  lineUserId: string;
  name: string;
}

const app = new Hono<{
  Bindings: Env;
  Variables: {
    user: LineUser;
    restaurantId: number;
  };
}>();

// CORS: allow configured origins via environment or fallback
const getAllowedOrigins = (env: Env): string[] => {
  const defaults = [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://app.lunchef.antu-technology.com',
    'https://dashboard.lunchef.antu-technology.com',
  ];
  return defaults;
};

app.use('*', cors({
  origin: (origin, c) => {
    const allowed = getAllowedOrigins(c.env);
    return allowed.includes(origin) ? origin : allowed[0];
  },
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

app.use('*', logger());

// Health check
app.get('/', (c) => c.json({ message: 'Lunchef API', version: '1.0.0' }));

// Routes
app.route('/api/locations', locationsRoutes);
app.route('/api/restaurants', restaurantsRoutes);
app.route('/api/orders', ordersRoutes);
app.route('/api/users', usersRoutes);
app.route('/api/menu', menuRoutes);
app.route('/api/dashboard', dashboardRoutes);
app.route('/webhook', webhookRoutes);

export default app;
