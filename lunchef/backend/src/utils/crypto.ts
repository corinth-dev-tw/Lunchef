/**
 * Constant-time string comparison using HMAC-SHA256.
 * Prevents timing attacks on password, token, and signature comparison.
 */
export async function timingSafeEqual(a: string, b: string): Promise<boolean> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    enc.encode('lunchef-compare-key'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sigA = await crypto.subtle.sign('HMAC', key, enc.encode(a));
  const sigB = await crypto.subtle.sign('HMAC', key, enc.encode(b));

  if (sigA.byteLength !== sigB.byteLength) return false;

  const va = new Uint8Array(sigA);
  const vb = new Uint8Array(sigB);
  let diff = 0;
  for (let i = 0; i < va.length; i++) {
    diff |= va[i] ^ vb[i];
  }
  return diff === 0;
}

/**
 * Parse cookie value by name from a Cookie header string.
 */
export function parseCookie(cookieHeader: string, name: string): string | null {
  const match = cookieHeader.match(new RegExp(`(?:^|;)\\s*${name}=([^;]+)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Extract a session token from an HttpOnly cookie, falling back to
 * the Authorization: Bearer header. This keeps cookie/header dual-mode
 * parsing in one place so admin.ts and auth.ts don't diverge.
 */
export function parseSessionToken(
  cookieHeader: string | undefined,
  cookieName: string,
  authHeader: string | undefined
): string | null {
  if (cookieHeader) {
    const fromCookie = parseCookie(cookieHeader, cookieName);
    if (fromCookie) return fromCookie;
  }
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }
  return null;
}

/**
 * Build a Set-Cookie header value with secure defaults.
 * SameSite=Lax is sufficient because all frontends share
 * lunchef.antu-technology.com. Partitioned adds cross-site isolation.
 */
export function buildSessionCookie(
  name: string,
  token: string,
  maxAge: number,
  domain?: string
): string {
  const parts = [`${name}=${token}`, 'HttpOnly', 'Secure', 'SameSite=Lax', 'Partitioned', `Max-Age=${maxAge}`, 'Path=/'];
  if (domain) parts.push(`Domain=${domain}`);
  return parts.join('; ');
}
