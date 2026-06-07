import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { useTranslation } from '../i18n'
import { adminApi } from '../utils/adminApi'

interface Restaurant {
  id: number
  name: string
  cuisine_type: string
  department_store: string
  floor: string
  order_cutoff_time: string
  min_order_type: string
  min_order_value: number
  location_ids: string | null
}

interface StaffMember {
  id: number
  restaurant_id: number
  line_user_id: string
  name: string
  role: string
  is_active: number
  created_at: string
}

interface MenuItem {
  id: number
  restaurant_id: number
  name: string
  description: string
  price: number
  category: string
  image_url: string
  available: number
}

interface AnalyticsSummary {
  date: string
  total_orders: number
  total_revenue: number
  active_restaurants: number
}

export default function AdminRestaurantsPage() {
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { logout } = useAdminAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [staffModalRestaurant, setStaffModalRestaurant] = useState<Restaurant | null>(null)
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffLineId, setNewStaffLineId] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('staff')

  const [menuModalOpen, setMenuModalOpen] = useState(false)
  const [menuModalRestaurant, setMenuModalRestaurant] = useState<Restaurant | null>(null)
  const [menuList, setMenuList] = useState<MenuItem[]>([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [menuForm, setMenuForm] = useState({ name: '', description: '', price: '', category: 'main', image_url: '' })
  const [editingMenuId, setEditingMenuId] = useState<number | null>(null)

  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null)

  useEffect(() => {
    fetchRestaurants()
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const data = await adminApi.get<AnalyticsSummary>('/api/admin/analytics/summary')
      setAnalytics(data)
    } catch (err: any) {
      console.error('Analytics error:', err)
    }
  }

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await adminApi.get<Restaurant[]>('/api/admin/restaurants')
      setRestaurants(data)
    } catch (err: any) {
      setError(err.message)
      if (err.message?.includes('Unauthorized')) logout()
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm(t('admin.restaurants.confirmDelete'))) return
    try {
      await adminApi.delete(`/api/admin/restaurants/${id}`)
      fetchRestaurants()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openStaffModal = async (restaurant: Restaurant) => {
    setStaffModalRestaurant(restaurant)
    setStaffModalOpen(true)
    setStaffLoading(true)
    setNewStaffName('')
    setNewStaffLineId('')
    setNewStaffRole('staff')
    try {
      const data = await adminApi.get<StaffMember[]>(`/api/admin/restaurants/${restaurant.id}/staff`)
      setStaffList(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setStaffLoading(false)
    }
  }

  const addStaff = async () => {
    if (!staffModalRestaurant || !newStaffName.trim() || !newStaffLineId.trim()) return
    try {
      await adminApi.post(`/api/admin/restaurants/${staffModalRestaurant.id}/staff`, {
        name: newStaffName.trim(),
        line_user_id: newStaffLineId.trim(),
        role: newStaffRole,
      })
      setNewStaffName('')
      setNewStaffLineId('')
      setNewStaffRole('staff')
      const data = await adminApi.get<StaffMember[]>(`/api/admin/restaurants/${staffModalRestaurant.id}/staff`)
      setStaffList(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const removeStaff = async (staffId: number) => {
    if (!confirm(t('admin.staff.removeConfirm'))) return
    try {
      await adminApi.delete(`/api/admin/staff/${staffId}`)
      if (staffModalRestaurant) {
        const data = await adminApi.get<StaffMember[]>(`/api/admin/restaurants/${staffModalRestaurant.id}/staff`)
        setStaffList(data)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const openMenuModal = async (restaurant: Restaurant) => {
    setMenuModalRestaurant(restaurant)
    setMenuModalOpen(true)
    setMenuLoading(true)
    setMenuForm({ name: '', description: '', price: '', category: 'main', image_url: '' })
    setEditingMenuId(null)
    try {
      const data = await adminApi.get<MenuItem[]>(`/api/admin/restaurants/${restaurant.id}/menu`)
      setMenuList(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setMenuLoading(false)
    }
  }

  const saveMenuItem = async () => {
    if (!menuModalRestaurant || !menuForm.name.trim() || !menuForm.price) return
    const payload = {
      name: menuForm.name.trim(),
      description: menuForm.description.trim(),
      price: parseInt(menuForm.price),
      category: menuForm.category,
      image_url: menuForm.image_url.trim(),
    }
    try {
      if (editingMenuId) {
        await adminApi.put(`/api/admin/menu/${editingMenuId}`, payload)
      } else {
        await adminApi.post(`/api/admin/restaurants/${menuModalRestaurant.id}/menu`, payload)
      }
      setMenuForm({ name: '', description: '', price: '', category: 'main', image_url: '' })
      setEditingMenuId(null)
      const data = await adminApi.get<MenuItem[]>(`/api/admin/restaurants/${menuModalRestaurant.id}/menu`)
      setMenuList(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const startEditMenu = (item: MenuItem) => {
    setEditingMenuId(item.id)
    setMenuForm({
      name: item.name,
      description: item.description,
      price: String(item.price),
      category: item.category,
      image_url: item.image_url,
    })
  }

  const toggleMenuAvailable = async (item: MenuItem) => {
    try {
      await adminApi.put(`/api/admin/menu/${item.id}`, { available: item.available ? 0 : 1 })
      if (menuModalRestaurant) {
        const data = await adminApi.get<MenuItem[]>(`/api/admin/restaurants/${menuModalRestaurant.id}/menu`)
        setMenuList(data)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  const deleteMenuItem = async (itemId: number) => {
    if (!confirm(t('admin.menu.deleteConfirm') || 'Delete this menu item?')) return
    try {
      await adminApi.delete(`/api/admin/menu/${itemId}`)
      if (menuModalRestaurant) {
        const data = await adminApi.get<MenuItem[]>(`/api/admin/restaurants/${menuModalRestaurant.id}/menu`)
        setMenuList(data)
      }
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">{t('admin.panelTitle')}</h1>
            <p className="text-sm text-gray-500">{t('admin.restaurants.title')}</p>
          </div>
          <div className="flex gap-3 items-center">
            <button
              onClick={() => navigate('/admin/locations')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              {t('nav.locations')}
            </button>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              {t('nav.orders')}
            </button>
            <button
              onClick={() => navigate('/admin/staff-requests')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              {t('nav.staffRequests')}
            </button>
            <button
              onClick={() => navigate('/admin/restaurants/new')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              + {t('admin.restaurants.addRestaurant')}
            </button>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              {t('auth.logout')}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Analytics Cards */}
        {analytics && (
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">{t('admin.analytics.totalOrdersToday')}</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.total_orders}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">{t('admin.analytics.totalRevenue')}</p>
              <p className="text-2xl font-bold text-gray-800">{t('admin.orders.totalRevenue')} {analytics.total_revenue.toLocaleString()}</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm p-4">
              <p className="text-sm text-gray-500">{t('admin.analytics.activeRestaurants')}</p>
              <p className="text-2xl font-bold text-gray-800">{analytics.active_restaurants}</p>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">{t('admin.restaurants.noRestaurants')}</p>
            <button
              onClick={() => navigate('/admin/restaurants/new')}
              className="mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
            >
              {t('admin.restaurants.addFirst')}
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">{t('admin.restaurants.table.name')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">{t('admin.restaurants.table.cuisine')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">{t('admin.restaurants.table.location')}</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">{t('admin.restaurants.table.cutoff')}</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {restaurants.map(r => (
                  <tr key={r.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <p className="font-bold text-gray-800">{r.name}</p>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">
                        {t(`cuisines.${r.cuisine_type}`) || r.cuisine_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{r.department_store} {r.floor}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{r.order_cutoff_time}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/restaurants/${r.id}/edit`)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => openMenuModal(r)}
                          className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                        >
                          {t('admin.restaurants.menu')}
                        </button>
                        <button
                          onClick={() => openStaffModal(r)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          {t('admin.restaurants.staff')}
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>

      {/* Staff Modal */}
      {staffModalOpen && staffModalRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {t('admin.staff.title', { name: staffModalRestaurant.name })}
              </h2>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">{t('admin.staff.addStaffMember')}</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    placeholder={t('admin.staff.namePlaceholder')}
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder={t('admin.staff.lineUserIdPlaceholder')}
                    value={newStaffLineId}
                    onChange={(e) => setNewStaffLineId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="staff">{t('admin.staffRequests.roles.staff')}</option>
                    <option value="manager">{t('admin.staffRequests.roles.manager')}</option>
                  </select>
                  <button
                    onClick={addStaff}
                    disabled={!newStaffName.trim() || !newStaffLineId.trim()}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition disabled:opacity-50"
                  >
                    {t('admin.staff.addStaff')}
                  </button>
                </div>
              </div>

              {staffLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : staffList.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">{t('admin.staff.noStaff')}</p>
              ) : (
                <div className="space-y-2">
                  {staffList.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.line_user_id}</p>
                        <p className="text-xs text-gray-400">{s.role} · {s.is_active ? t('admin.staff.active') : t('admin.staff.inactive')}</p>
                      </div>
                      <button
                        onClick={() => removeStaff(s.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                      >
                        {t('admin.staff.remove')}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Menu Modal */}
      {menuModalOpen && menuModalRestaurant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">
                {t('admin.menu.title', { name: menuModalRestaurant.name })}
              </h2>
              <button
                onClick={() => { setMenuModalOpen(false); setEditingMenuId(null); }}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">
                  {editingMenuId ? t('admin.menu.editItem') : t('admin.menu.addItem')}
                </h3>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    placeholder={t('admin.menu.placeholder.itemName')}
                    value={menuForm.name}
                    onChange={(e) => setMenuForm({ ...menuForm, name: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder={t('admin.menu.placeholder.description')}
                    value={menuForm.description}
                    onChange={(e) => setMenuForm({ ...menuForm, description: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      placeholder={t('admin.menu.placeholder.price')}
                      value={menuForm.price}
                      onChange={(e) => setMenuForm({ ...menuForm, price: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                    <select
                      value={menuForm.category}
                      onChange={(e) => setMenuForm({ ...menuForm, category: e.target.value })}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    >
                      <option value="main">{t('admin.menu.categories.main')}</option>
                      <option value="side">{t('admin.menu.categories.side')}</option>
                      <option value="drink">{t('admin.menu.categories.drink')}</option>
                      <option value="dessert">{t('admin.menu.categories.dessert')}</option>
                    </select>
                  </div>
                  <input
                    type="url"
                    placeholder={t('admin.menu.placeholder.imageUrl')}
                    value={menuForm.image_url}
                    onChange={(e) => setMenuForm({ ...menuForm, image_url: e.target.value })}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={saveMenuItem}
                      disabled={!menuForm.name.trim() || !menuForm.price}
                      className="flex-1 bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition disabled:opacity-50"
                    >
                      {editingMenuId ? t('common.save') : t('admin.menu.addItem')}
                    </button>
                    {editingMenuId && (
                      <button
                        onClick={() => { setEditingMenuId(null); setMenuForm({ name: '', description: '', price: '', category: 'main', image_url: '' }); }}
                        className="text-gray-500 text-sm font-medium py-2 px-4"
                      >
                        {t('common.cancel')}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {menuLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : menuList.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">{t('admin.menu.noItems')}</p>
              ) : (
                <div className="space-y-2">
                  {menuList.map(item => (
                    <div key={item.id} className={`flex items-center justify-between rounded-lg p-3 ${item.available ? 'bg-gray-50' : 'bg-red-50 opacity-60'}`}>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm text-gray-800">{item.name}</p>
                          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-0.5 rounded">{t(`admin.menu.categories.${item.category}`)}</span>
                          {!item.available && <span className="text-xs bg-red-200 text-red-700 px-2 py-0.5 rounded">{t('admin.menu.unavailable')}</span>}
                        </div>
                        <p className="text-xs text-gray-500">{item.description}</p>
                        <p className="text-sm font-bold text-green-600">${item.price}</p>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => toggleMenuAvailable(item)}
                          className="text-xs text-gray-500 hover:text-gray-700 font-medium px-2 py-1"
                        >
                          {item.available ? t('admin.menu.hide') : t('admin.menu.show')}
                        </button>
                        <button
                          onClick={() => startEditMenu(item)}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1"
                        >
                          {t('common.edit')}
                        </button>
                        <button
                          onClick={() => deleteMenuItem(item.id)}
                          className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                        >
                          {t('common.delete')}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
