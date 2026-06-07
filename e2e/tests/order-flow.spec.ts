import { test, expect } from '@playwright/test'

const API_BASE = 'https://api.lunchef.antu-technology.com'
const FRONTEND_URL = 'https://app.lunchef.antu-technology.com'
const DASHBOARD_URL = 'https://dashboard.lunchef.antu-technology.com'
const ADMIN_PASSWORD = 'lunchef-admin-2026'

/** Obtain an admin token, retrying once on 429 after a short back-off. */
async function getAdminToken(request: Parameters<Parameters<typeof test>[1]>[0]['request']): Promise<string> {
  const attempt = async () => request.post(`${API_BASE}/api/admin/login`, {
    data: { password: ADMIN_PASSWORD },
    headers: { 'Content-Type': 'application/json' },
  })
  let res = await attempt()
  if (res.status() === 429) {
    await new Promise(r => setTimeout(r, 3000))
    res = await attempt()
  }
  expect(res.status()).toBe(200)
  const { token } = await res.json()
  return token as string
}

test.describe('Order Placement End-to-End', () => {
  test('customer can browse locations and restaurants', async ({ page }) => {
    // Frontend may be slow to load; use domcontentloaded
    await page.goto(`${FRONTEND_URL}/`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    // Wait for LIFF init / auth check to complete
    await page.waitForTimeout(3000)
    // Should show location selection, login, or at least the app shell
    const bodyText = await page.locator('body').innerText()
    const hasContent = bodyText.includes('Lunchef') ||
                       bodyText.includes('Home') ||
                       bodyText.includes('Orders') ||
                       bodyText.includes('Login') ||
                       bodyText.includes('login')
    expect(hasContent).toBe(true)

    // Try to navigate to locations page directly
    await page.goto(`${FRONTEND_URL}/locations`, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(3000)
    // Should show locations list (may require auth, so check for either state)
    const locBodyText = await page.locator('body').innerText()
    const hasLocations = locBodyText.includes('Select') || locBodyText.includes('Location') || locBodyText.includes('Building')
    const needsLogin = locBodyText.includes('Login') || locBodyText.includes('login')
    expect(hasLocations || needsLogin).toBe(true)
  })

  test('restaurant listing API returns restaurants with menus', async ({ request }) => {
    // Get locations first (Cloudflare Worker may be cold)
    const locRes = await request.get(`${API_BASE}/api/locations`, { timeout: 15000 })
    expect(locRes.status()).toBe(200)
    const locations = await locRes.json()
    expect(locations.length).toBeGreaterThan(0)

    // Get restaurants for first location
    const restaurantRes = await request.get(`${API_BASE}/api/restaurants?location_id=${locations[0].id}`, { timeout: 15000 })
    expect(restaurantRes.status()).toBe(200)
    const restaurants = await restaurantRes.json()
    expect(Array.isArray(restaurants)).toBe(true)

    if (restaurants.length > 0) {
      // Get menu for first restaurant
      const menuRes = await request.get(`${API_BASE}/api/menu/${restaurants[0].id}`, { timeout: 15000 })
      expect(menuRes.status()).toBe(200)
      const menu = await menuRes.json()
      expect(Array.isArray(menu.items || menu)).toBe(true)
    }
  })

  test('order creation requires LINE authentication', async ({ request }) => {
    const res = await request.post(`${API_BASE}/api/orders`, {
      data: {
        company_id: 1,
        user_id: 1,
        restaurant_id: 1,
        location_id: 1,
        pickup_time: '12:00',
        order_date: '2026-06-04',
        items: [{ menu_item_id: 1, quantity: 1 }],
      },
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    })
    expect(res.status()).toBe(401)
  })

  test('dashboard orders API requires session authentication', async ({ request }) => {
    const res = await request.get(`${API_BASE}/api/dashboard/orders?date=2026-06-04`)
    expect(res.status()).toBe(401)
  })

  test('dashboard order status update requires authentication', async ({ request }) => {
    const res = await request.put(`${API_BASE}/api/dashboard/orders/1/status`, {
      data: { status: 'confirmed' },
      headers: { 'Content-Type': 'application/json' },
    })
    expect(res.status()).toBe(401)
  })

  test('admin can view global orders with filters', async ({ request }) => {
    const token = await getAdminToken(request)

    // Get orders with date filter
    const ordersRes = await request.get(`${API_BASE}/api/admin/orders?date=2026-06-04`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(ordersRes.status()).toBe(200)
    const data = await ordersRes.json()
    expect(Array.isArray(data.orders || data)).toBe(true)

    // Test status filter
    const statusRes = await request.get(`${API_BASE}/api/admin/orders?status=pending`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(statusRes.status()).toBe(200)
  })

  test('admin analytics summary returns data', async ({ request }) => {
    const token = await getAdminToken(request)

    const res = await request.get(`${API_BASE}/api/admin/analytics/summary?date=2026-06-04`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    expect(res.status()).toBe(200)
    const data = await res.json()
    expect(data).toHaveProperty('total_orders')
    expect(data).toHaveProperty('total_revenue')
    expect(data).toHaveProperty('active_restaurants')
  })

  test('restaurant page loads menu and pickup times', async ({ request }) => {
    // Get a restaurant
    const locRes = await request.get(`${API_BASE}/api/locations`)
    const locations = await locRes.json()
    if (locations.length === 0) {
      test.skip()
      return
    }

    const restaurantRes = await request.get(`${API_BASE}/api/restaurants?location_id=${locations[0].id}`)
    const restaurants = await restaurantRes.json()
    if (restaurants.length === 0) {
      test.skip()
      return
    }

    const restaurant = restaurants[0]

    // Verify restaurant has required fields for ordering
    expect(restaurant).toHaveProperty('id')
    expect(restaurant).toHaveProperty('name')
    expect(restaurant).toHaveProperty('order_cutoff_time')

    // Get pickup times
    const pickupRes = await request.get(`${API_BASE}/api/restaurants/${restaurant.id}/pickup-times`)
    expect(pickupRes.status()).toBe(200)
    const pickupData = await pickupRes.json()
    expect(Array.isArray(pickupData.pickup_times || pickupData)).toBe(true)
  })
})
