import { test, expect } from '@playwright/test'

const API_BASE = 'https://api.lunchef.antu-technology.com'

test.describe('Customer Frontend', () => {
  test('homepage loads with restaurant cards', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('text=Lunchef')).toBeVisible()
    await expect(page.getByRole('button', { name: 'Login with LINE' })).toBeVisible()
  })

  test('restaurant listing API returns data with location filter', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/restaurants?location_id=1`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('name')
    expect(data[0]).toHaveProperty('cuisine_type')
  })

  test('restaurant listing API supports search and cuisine filters', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/restaurants?search=泰&cuisine=thai`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
  })

  test('single restaurant API returns menu and pickup times', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/restaurants/1`)
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('id')
    expect(data).toHaveProperty('name')
    expect(data).toHaveProperty('pickup_times')
    expect(Array.isArray(data.pickup_times)).toBe(true)
  })

  test('frontend redirects to LINE login when not authenticated', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 15000 })
    const loginBtn = page.getByRole('button', { name: 'Login with LINE' })
    await expect(loginBtn).toBeVisible()
    // Clicking it should redirect to LINE OAuth
    await loginBtn.click()
    await expect(page).toHaveURL(/access\.line\.me/, { timeout: 10000 })
  })
})
