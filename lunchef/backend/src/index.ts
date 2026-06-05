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
import adminRoutes from './routes/admin';
import staffRoutes from './routes/staff';
import { rateLimitMiddleware } from './middleware/rateLimit';

export interface Env {
  DB: D1Database;
  CACHE: KVNamespace;
  LINE_CHANNEL_ACCESS_TOKEN: string;
  LINE_CHANNEL_SECRET: string;
  ADMIN_PASSWORD: string;
  ENVIRONMENT: string;
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

// CORS: strict origin checking based on environment
const getAllowedOrigins = (env: Env): string[] => {
  if (env.ENVIRONMENT === 'production') {
    return [
      'https://app.lunchef.antu-technology.com',
      'https://dashboard.lunchef.antu-technology.com',
    ];
  }
  return [
    'http://localhost:5173',
    'http://localhost:5174',
    'https://app.lunchef.antu-technology.com',
    'https://dashboard.lunchef.antu-technology.com',
  ];
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

// Rate limiting: general API limit
app.use('/api/*', rateLimitMiddleware({ max: 100, window: 60 }));
// Stricter limits for sensitive endpoints
app.use('/api/admin/login', rateLimitMiddleware({ max: 5, window: 300 }));
app.use('/api/dashboard/line-login', rateLimitMiddleware({ max: 10, window: 300 }));
app.use('/api/staff/register', rateLimitMiddleware({ max: 10, window: 3600 }));
app.use('/api/orders', rateLimitMiddleware({ max: 30, window: 60 }));

// Security headers
app.use('*', async (c, next) => {
  await next();
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('X-Frame-Options', 'DENY');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
  c.header('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
});

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
app.route('/api/admin', adminRoutes);
app.route('/api/staff', staffRoutes);

export default app;
