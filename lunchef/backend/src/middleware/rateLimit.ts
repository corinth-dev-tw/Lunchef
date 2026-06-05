import type { MiddlewareHandler } from 'hono';
import type { Env } from '../index';

interface RateLimitOptions {
  max: number;      // max requests
  window: number;   // window in seconds
}

/**
 * Sliding-window rate limiter using 1-minute buckets in KV.
 * Trusts only CF-Connecting-IP (Cloudflare sets this reliably).
 * Falls back to 'unknown' only when running outside Cloudflare.
 */
export function rateLimitMiddleware(options: RateLimitOptions): MiddlewareHandler<{
  Bindings: Env;
}> {
  return async (c, next) => {
    // Skip rate limiting for webhook (LINE sends retries)
    if (c.req.path === '/webhook') {
      return next();
    }

    // Trust only Cloudflare's connecting-IP header; X-Forwarded-For is client-spoofable
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `rate_limit:${c.req.method}:${c.req.path}:${ip}`;

    try {
      const now = Math.floor(Date.now() / 1000);
      const bucketSize = 60; // 1-minute buckets
      const currentBucket = Math.floor(now / bucketSize);
      const bucketsToKeep = Math.ceil(options.window / bucketSize);
      const windowStart = currentBucket - bucketsToKeep + 1;

      const stored = await c.env.CACHE.get(key);
      const counts: Record<string, number> = stored ? JSON.parse(stored) : {};

      // Drop old buckets outside the sliding window
      const activeCounts: Record<string, number> = {};
      for (const [bucket, count] of Object.entries(counts)) {
        const b = parseInt(bucket);
        if (b >= windowStart) {
          activeCounts[b] = count;
        }
      }

      // Calculate current window total
      const currentTotal = Object.entries(activeCounts).reduce(
        (sum, [bucket, count]) => {
          const b = parseInt(bucket);
          return b >= windowStart ? sum + count : sum;
        },
        0
      );

      if (currentTotal >= options.max) {
        c.header('Retry-After', String(options.window));
        return c.json({ error: 'Too many requests. Please try again later.' }, 429);
      }

      // Increment current bucket
      activeCounts[currentBucket] = (activeCounts[currentBucket] || 0) + 1;

      await c.env.CACHE.put(key, JSON.stringify(activeCounts), {
        expirationTtl: options.window + bucketSize,
      });
    } catch {
      // If KV fails, allow the request through (fail open)
    }

    return next();
  };
}
