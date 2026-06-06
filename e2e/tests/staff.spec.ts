import { test, expect } from '@playwright/test'

const API_BASE = 'https://api.lunchef.antu-technology.com'
const DASHBOARD_URL = 'https://dashboard.lunchef.antu-technology.com'
const ADMIN_PASSWORD = 'lunchef-admin-2026'

test.describe('Staff Registration Flow', () => {
  test('staff register page responds', async ({ page }) => {
    // LIFF init hangs in non-LINE browsers; just verify the URL loads
    const res = await page.goto(`${DASHBOARD_URL}/register-staff`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    expect(res?.status()).toBeLessThan(500)
    // The page HTML should contain the app root
    const html = await page.content()
    expect(html.includes('root') || html.includes('app') || html.includes('職員申請')).toBe(true)
  })

  test('staff status API rejects invalid token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/staff/status`, {
      data: { access_token: 'invalid-token-12345' },
      headers: { 'Content-Type': 'application/json' },
    })
    // Should return error for invalid token (401 or 403 or 400)
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('staff register API rejects missing token', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/staff/register`, {
      data: {},
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBeGreaterThanOrEqual(400)
    expect(res.status()).toBeLessThan(500)
  })

  test('admin staff-requests page shows correct UI', async ({ page }) => {
    // Login as admin
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("登入")')
    await expect(page).toHaveURL(/\/admin\/restaurants/)

    // Navigate to staff requests
    await page.click('text=職員申請')
    await expect(page).toHaveURL(/\/admin\/staff-requests/)
    await expect(page.locator('text=審核職員加入申請')).toBeVisible()

    // Wait for loading to finish
    await page.waitForTimeout(2000)

    // Should show either pending requests or empty state (in Chinese)
    const bodyText = await page.locator('body').innerText()
    const hasContent = bodyText.includes('待審核') ||
                       bodyText.includes('目前無待審核') ||
                       bodyText.includes('核准') ||
                       bodyText.includes('拒絕')
    expect(hasContent).toBe(true)
  })

  test('admin can access staff request endpoints', async ({ request }) => {
    // Admin login to get token
    const loginRes = await request.post(`${API_BASE}/api/admin/login`, {
      data: { password: ADMIN_PASSWORD },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(loginRes.status()).toBe(200)
    const { token } = await loginRes.json()

    // Get staff requests
    const res = await request.get(`${API_BASE}/api/admin/staff-requests`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data.requests || data)).toBe(true)
  })
})
