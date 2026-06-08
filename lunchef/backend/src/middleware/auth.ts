import type { MiddlewareHandler } from 'hono';
import type { Env } from '../index';
import { parseSessionToken } from '../utils/crypto';
import { t, getLocale } from '../i18n';

interface LineProfile {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  statusMessage?: string;
}

interface LineUser {
  lineUserId: string;
  name: string;
}

// Verify LINE access token by calling LINE Profile API
// https://developers.line.biz/en/reference/line-login/#get-user-profile
export const lineAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: { user: LineUser };
}> = async (c, next) => {
  const locale = getLocale(c);
  const authHeader = c.req.header('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return c.json({ error: t('errors.missingAuthHeader', locale) }, 401);
  }

  const accessToken = authHeader.slice(7);

  // Check KV cache (5 min TTL to avoid hammering LINE API)
  const cacheKey = `line_auth:${accessToken}`;
  try {
    const cached = await c.env.CACHE.get(cacheKey);
    if (cached) {
      c.set('user', JSON.parse(cached) as LineUser);
      return next();
    }
  } catch {
    // Cache miss or error, proceed to verify with LINE
  }

  // Verify token with LINE server
  // https://api.line.me/v2/profile
  const response = await fetch('https://api.line.me/v2/profile', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    return c.json({ error: t('errors.invalidLineToken', locale) }, 401);
  }

  const profile = (await response.json()) as LineProfile;
  const user: LineUser = {
    lineUserId: profile.userId,
    name: profile.displayName,
  };

  // Cache verified user for 5 minutes
  await c.env.CACHE.put(cacheKey, JSON.stringify(user), { expirationTtl: 300 });

  c.set('user', user);
  await next();
};

// Dashboard auth: verify session token from cookie or Authorization header
export const dashboardAuthMiddleware: MiddlewareHandler<{
  Bindings: Env;
  Variables: { restaurantId: number };
}> = async (c, next) => {
  const locale = getLocale(c);
  const token = parseSessionToken(
    c.req.header('Cookie'),
    'dashboard_session',
    c.req.header('Authorization')
  );

  if (!token) {
    return c.json({ error: t('errors.missingSession', locale) }, 401);
  }

  const sessionData = await c.env.CACHE.get(`dashboard_session:${token}`);

  if (!sessionData) {
    return c.json({ error: t('errors.invalidSession', locale) }, 401);
  }

  try {
    const { restaurantId } = JSON.parse(sessionData) as { restaurantId: number };
    c.set('restaurantId', restaurantId);
    await next();
  } catch {
    return c.json({ error: t('errors.invalidSessionData', locale) }, 401);
  }
};
