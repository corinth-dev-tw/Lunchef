# Lunchef Security Audit Report

**Date**: 2026-06-04  
**Scope**: Backend API (Cloudflare Workers), Dashboard (React), Frontend (React)  
**Auditor**: Kimi Code CLI  

---

## 🔴 Critical Findings

### 1. Auth Tokens Stored in localStorage — XSS Vulnerability

**Location**: `dashboard/src/contexts/AdminAuthContext.tsx`, `dashboard/src/contexts/AuthContext.tsx`, `dashboard/src/utils/api.ts`

**Issue**: Admin token (`admin_token`) and dashboard token (`dashboard_token`) are stored in `localStorage`. Any XSS vulnerability (e.g., via a compromised npm dependency, unsanitized user input, or a malicious browser extension) can steal these tokens immediately.

**Impact**: Complete account takeover for admin and restaurant staff.

**Fix**: Store tokens in `HttpOnly; Secure; SameSite=Strict` cookies. The backend should set cookies on login responses, and the frontend should not touch tokens directly.

```typescript
// Backend: Set cookie on login
const setCookie = (token: string) => {
  c.header('Set-Cookie',
    `admin_token=${token}; HttpOnly; Secure; SameSite=Strict; Max-Age=86400; Path=/`
  );
};
```

---

### 2. No Rate Limiting — Brute Force & DoS Risk

**Location**: All API routes (`backend/src/routes/*.ts`)

**Issue**: No rate limiting on any endpoint. Specifically vulnerable:
- `POST /api/admin/login` — brute force admin password
- `POST /api/staff/register` — spam registration requests
- `POST /api/orders` — order spam / DoS
- `POST /api/dashboard/line-login` — brute force/dashboard spam

**Impact**: Credential stuffing, resource exhaustion, abuse.

**Fix**: Implement rate limiting using Cloudflare KV as a counter store:

```typescript
// Middleware: rate limit by IP
const rateLimit = async (c: Context, max: number, window: number) => {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${c.req.path}:${ip}`;
  const current = await c.env.CACHE.get(key);
  const count = current ? parseInt(current) : 0;
  if (count >= max) return c.json({ error: 'Too many requests' }, 429);
  await c.env.CACHE.put(key, String(count + 1), { expirationTtl: window });
};
```

Priority: Admin login (5/min), staff register (10/hour), order creation (30/min).

---

### 3. No Input Validation / Schema Validation

**Location**: `backend/src/routes/admin.ts`, `backend/src/routes/orders.ts`, `backend/src/routes/staff.ts`

**Issue**: Request bodies are parsed with `c.req.json<any>()` and fields are inserted directly into the database without validation:
- `name`, `description`, `image_url` — no length limits
- `price` — no type/range validation (could be negative, NaN, or extremely large)
- `location_ids`, `pickup_times` — no array validation (could be non-arrays)
- `status` — whitelisted but no validation on other fields

**Impact**: XSS via stored data (if `image_url` or `name` contains `<script>` and is rendered unsafely), DoS via extremely long strings, data corruption.

**Fix**: Add Zod schema validation to all POST/PUT endpoints:

```typescript
import { z } from 'zod';

const CreateRestaurantSchema = z.object({
  name: z.string().min(1).max(100),
  cuisine_type: z.string().max(50).optional(),
  department_store: z.string().min(1).max(100),
  floor: z.string().max(20).optional(),
  phone: z.string().max(20).optional(),
  image_url: z.string().url().max(500).optional(),
  order_cutoff_time: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  min_order_type: z.enum(['items', 'amount']).optional(),
  min_order_value: z.number().int().min(1).max(10000).optional(),
  location_ids: z.array(z.number().int().positive()).max(50).optional(),
  pickup_times: z.array(z.string().regex(/^\d{2}:\d{2}$/)).max(20).optional(),
});
```

---

## 🟠 High Findings

### 4. Missing Authorization on User Profile Endpoint

**Location**: `backend/src/routes/users.ts:76-87`

**Issue**: `GET /api/users/:id` is protected by `lineAuthMiddleware` but does NOT verify that the requested `id` matches the authenticated user's ID. Any authenticated user can query any other user's profile, including `company_id`, `tax_id`, etc.

**Fix**:
```typescript
app.get('/:id', lineAuthMiddleware, async (c) => {
  const id = c.req.param('id');
  const user = c.get('user');
  
  const authedUser = await c.env.DB.prepare(
    'SELECT id FROM users WHERE line_user_id = ?'
  ).bind(user.lineUserId).first<{ id: number }>();
  
  if (!authedUser || authedUser.id !== parseInt(id)) {
    return c.json({ error: 'Forbidden' }, 403);
  }
  // ... rest of handler
});
```

---

### 5. CORS Allows localhost with Credentials in Production

**Location**: `backend/src/index.ts:36-54`

**Issue**: CORS configuration unconditionally includes `http://localhost:5173` and `http://localhost:5174` with `credentials: true`. In production, this should not be allowed.

**Fix**:
```typescript
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
```

---

## 🟡 Medium Findings

### 6. Admin Session Token TTL is 24 Hours

**Location**: `backend/src/routes/admin.ts:47-51`

**Issue**: Admin sessions are valid for 24 hours (`expirationTtl: 86400`). This is a long window for a high-privilege account.

**Fix**: Reduce to 8 hours for admin sessions. Consider implementing a refresh mechanism if needed.

---

### 7. No Content Security Policy Headers

**Location**: `backend/src/index.ts`

**Issue**: No CSP headers are set. If an XSS vector exists, it can load external scripts, connect to arbitrary APIs, etc.

**Fix**: Add security headers middleware:

```typescript
app.use('*', async (c, next) => {
  await next();
  c.header('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' https: data:; connect-src 'self' https://api.line.me;");
  c.header('X-Frame-Options', 'DENY');
  c.header('X-Content-Type-Options', 'nosniff');
  c.header('Referrer-Policy', 'strict-origin-when-cross-origin');
});
```

---

### 8. Admin API Client Doesn't Handle 401

**Location**: `dashboard/src/utils/adminApi.ts`

**Issue**: Unlike the dashboard API client (`dashboard/src/utils/api.ts`), the admin API client does not clear the token or redirect on 401. A stale admin token could cause repeated failed requests without user feedback.

**Fix**: Add 401 handling to `adminApi.ts`:

```typescript
if (response.status === 401) {
  localStorage.removeItem('admin_token');
  window.location.href = '/admin';
  throw new Error('Session expired');
}
```

---

### 9. Order Number Uses Math.random() (Non-Cryptographic)

**Location**: `backend/src/routes/orders.ts:60-69`

**Issue**: `generateOrderNumber()` uses `Math.random()` for uniqueness. While collision retry exists, it's not cryptographically secure.

**Fix**: Use Web Crypto API:

```typescript
function generateOrderNumber(): string {
  const now = new Date();
  const dateStr = now.toLocaleDateString('en-CA', { timeZone: 'Asia/Taipei' }).replace(/-/g, '');
  const random = crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().padStart(4, '0').slice(0, 4);
  return `LCE-${dateStr}-${random}`;
}
```

---

### 10. Infrastructure IDs Exposed in wrangler.toml

**Location**: `backend/wrangler.toml`

**Issue**: KV namespace ID and D1 database ID are committed to the repository. While these are not secrets per se, they expose internal infrastructure details.

**Risk**: Low — these IDs alone don't grant access without Cloudflare API tokens.

**Fix**: Move IDs to environment variables or use `.env` files excluded from git.

---

## ✅ Security Positives

| Aspect | Status | Notes |
|--------|--------|-------|
| SQL Injection | ✅ Safe | All queries use parameterized statements (`.bind()`) |
| Password Hashing | ✅ N/A | No user passwords stored (LINE OAuth only) |
| Webhook Signature | ✅ Verified | LINE webhook HMAC-SHA256 signature verified |
| Webhook Deduplication | ✅ Implemented | Event IDs cached in KV for 24h |
| Order Auth | ✅ Verified | Orders checked against authenticated user's company |
| Dashboard Auth | ✅ Verified | Session tokens stored in KV with TTL |
| Admin Auth | ✅ Implemented | Session-based with KV TTL |
| Soft Deletes | ✅ Used | Restaurants, locations use `is_active` flag |
| No eval/dangerouslySetInnerHTML | ✅ Clean | None found in frontend or dashboard |
| Error Sanitization | ✅ Partial | Most errors are generic; some log details server-side |
| CORS Credentials | ✅ Controlled | Only allowed origins can send credentials |
| LINE Token Verification | ✅ Verified | All LINE tokens verified against LINE Profile API |

---

## 📋 Prioritized Remediation Plan

| Priority | Issue | Effort | File(s) |
|----------|-------|--------|---------|
| P0 | Add rate limiting (admin login, orders) | Medium | `backend/src/middleware/rateLimit.ts` |
| P0 | Move auth tokens to HttpOnly cookies | High | `backend/src/routes/admin.ts`, `backend/src/routes/dashboard.ts`, contexts |
| P1 | Add Zod input validation to all POST/PUT | Medium | `backend/src/routes/admin.ts`, `backend/src/routes/orders.ts` |
| P1 | Fix user profile authorization | Low | `backend/src/routes/users.ts` |
| P2 | Restrict CORS in production | Low | `backend/src/index.ts` |
| P2 | Add security headers (CSP) | Low | `backend/src/index.ts` |
| P2 | Reduce admin session TTL | Low | `backend/src/routes/admin.ts` |
| P3 | Fix adminApi 401 handling | Low | `dashboard/src/utils/adminApi.ts` |
| P3 | Use crypto RNG for order numbers | Low | `backend/src/routes/orders.ts` |
