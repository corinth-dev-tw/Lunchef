import { test, expect } from '@playwright/test'

const API_BASE = 'https://api.lunchef.antu-technology.com'
const DASHBOARD_URL = 'https://dashboard.lunchef.antu-technology.com'
const ADMIN_PASSWORD = 'lunchef-admin-2026'

test.describe('Admin Panel', () => {
  test('admin login works', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("Login")')
    await expect(page).toHaveURL(/\/admin\/restaurants/)
    await expect(page.locator('text=Manage Restaurants')).toBeVisible()
  })

  test('analytics cards are visible after login', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("Login")')
    await expect(page.locator('text=Total Orders Today')).toBeVisible()
    await expect(page.locator('text=Total Revenue')).toBeVisible()
    await expect(page.locator('text=Active Restaurants')).toBeVisible()
  })

  test('locations page CRUD', async ({ page, request }) => {
    // Login first
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("Login")')

    // Navigate to locations
    await page.click('text=Locations')
    await expect(page).toHaveURL(/\/admin\/locations/)
    await expect(page.locator('text=Manage Office Buildings')).toBeVisible()

    const locName = `Test Building E2E-${Date.now()}`

    // Add a new location
    await page.click('text=+ Add Location')
    await page.fill('input[placeholder="Location name"]', locName)
    await page.fill('input[placeholder="Address"]', '123 Test Road')
    await page.click('button:has-text("Save")')

    // Verify it appears
    await expect(page.getByRole('cell', { name: locName })).toBeVisible()

    // Delete it
    page.on('dialog', dialog => dialog.accept())
    const row = page.locator('tr', { hasText: locName })
    await row.locator('button:has-text("Delete")').click()
    // Wait for item to disappear
    await expect(page.getByRole('cell', { name: locName })).not.toBeVisible({ timeout: 5000 })
  })

  test('restaurant creation and menu management', async ({ page }) => {
    // Login
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("Login")')

    const restName = `E2E Test Kitchen-${Date.now()}`

    // Add restaurant
    await page.click('text=+ Add Restaurant')
    await page.waitForURL(/\/admin\/restaurants\/new/)
    await page.locator('input[type="text"]').first().fill(restName)
    await page.fill('input[placeholder="e.g. ATT 4 FUN"]', 'E2E Mall')
    await page.fill('input[placeholder="e.g. B1"]', '3F')
    await page.click('text=Create Restaurant')

    // Should redirect back to restaurants list
    await expect(page).toHaveURL(/\/admin\/restaurants/)
    await expect(page.getByText(restName).first()).toBeVisible()

    // Open menu modal
    const row = page.locator('tr', { hasText: restName })
    await row.locator('button:has-text("Menu")').click()
    await expect(page.locator('text=Menu: ' + restName)).toBeVisible()

    // Add menu item
    await page.fill('input[placeholder="Item name"]', 'E2E Burger')
    await page.fill('input[placeholder="Description"]', 'Test burger for E2E')
    await page.fill('input[placeholder="Price"]', '250')
    await page.click('button:has-text("Add Item")')
    await expect(page.locator('text=E2E Burger')).toBeVisible()

    // Close modal and delete restaurant
    await page.locator('button:has-text("×")').first().click()
    page.on('dialog', dialog => dialog.accept())
    const restaurantRow = page.locator('tr', { hasText: restName })
    await restaurantRow.locator('button:has-text("Delete")').click()
    await expect(page.getByText(restName).first()).not.toBeVisible({ timeout: 5000 })
  })

  test('admin API endpoints are protected', async ({ request }) => {
    const endpoints = [
      '/api/admin/restaurants',
      '/api/admin/locations',
      '/api/admin/orders',
      '/api/admin/analytics/summary',
      '/api/admin/staff-requests',
    ]

    for (const endpoint of endpoints) {
      const res = await request.get(`${API_BASE}${endpoint}`)
      expect(res.status(), `Expected 401 for ${endpoint}`).toBe(401)
    }
  })

  test('staff requests page loads', async ({ page }) => {
    await page.goto(`${DASHBOARD_URL}/admin`)
    await page.fill('input[type="password"]', ADMIN_PASSWORD)
    await page.click('button:has-text("Login")')
    await page.click('text=Staff Requests')
    await expect(page).toHaveURL(/\/admin\/staff-requests/)
    await expect(page.locator('text=Approve or reject staff registrations')).toBeVisible()
  })
})
