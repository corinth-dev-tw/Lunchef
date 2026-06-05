import type { MiddlewareHandler } from 'hono';
import type { Env } from '../index';

interface RateLimitOptions {
  max: number;      // max requests
  window: number;   // window in seconds
}

export function rateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler<{
  Bindings: Env;
}> {
  return async (c, next) => {
    // Skip rate limiting for webhook (LINE sends retries)
    if (c.req.path === '/webhook') {
      return next();
    }

    const ip = c.req.header('CF-Connecting-IP') ||
               c.req.header('X-Forwarded-For')?.split(',')[0]?.trim() ||
               'unknown';

    const key = `rate_limit:${c.req.method}:${c.req.path}:${ip}`;

    try {
      const current = await c.env.CACHE.get(key);
      const count = current ? parseInt(current) : 0;

      if (count >= options.max) {
        c.header('Retry-After', String(options.window));
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }

      await c.env.CACHE.put(key, String(count + 1), { expirationTtl: options.window });
    } catch {
      // If KV fails, allow the request through (fail open)
    }

    return next();
  };
}
