import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { adminApi } from '../utils/adminApi'

interface Restaurant {
  id: number
  name: string
  cuisine_type: string
  department_store: string
  floor: string
  api_key: string
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

const CUISINE_LABELS: Record<string, string> = {
  thai: 'Thai', japanese: 'Japanese', korean: 'Korean',
  chinese: 'Chinese', italian: 'Italian', american: 'American',
  vietnamese: 'Vietnamese', indian: 'Indian', asian: 'Asian',
}

export default function AdminRestaurantsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAdminAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showKeyFor, setShowKeyFor] = useState<number | null>(null)

  // Staff modal state
  const [staffModalOpen, setStaffModalOpen] = useState(false)
  const [staffModalRestaurant, setStaffModalRestaurant] = useState<Restaurant | null>(null)
  const [staffList, setStaffList] = useState<StaffMember[]>([])
  const [staffLoading, setStaffLoading] = useState(false)
  const [newStaffName, setNewStaffName] = useState('')
  const [newStaffLineId, setNewStaffLineId] = useState('')
  const [newStaffRole, setNewStaffRole] = useState('staff')

  useEffect(() => {
    if (token) {
      adminApi.setToken(token)
      fetchRestaurants()
    }
  }, [token])

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
    if (!confirm('Are you sure you want to delete this restaurant?')) return
    try {
      await adminApi.delete(`/api/admin/restaurants/${id}`)
      fetchRestaurants()
    } catch (err: any) {
      setError(err.message)
    }
  }

  const handleRegenerateKey = async (id: number) => {
    if (!confirm('Regenerate API key? The old key will stop working immediately.')) return
    try {
      const data = await adminApi.post<{ api_key: string }>(`/api/admin/restaurants/${id}/regenerate-key`, {})
      setRestaurants(prev => prev.map(r => r.id === id ? { ...r, api_key: data.api_key } : r))
      setShowKeyFor(id)
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
      // Refresh staff list
      const data = await adminApi.get<StaffMember[]>(`/api/admin/restaurants/${staffModalRestaurant.id}/staff`)
      setStaffList(data)
    } catch (err: any) {
      setError(err.message)
    }
  }

  const removeStaff = async (staffId: number) => {
    if (!confirm('Remove this staff member?')) return
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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Admin Panel</h1>
            <p className="text-sm text-gray-500">Manage Restaurants</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/restaurants/new')}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              + Add Restaurant
            </button>
            <button
              onClick={logout}
              className="text-gray-500 hover:text-gray-700 text-sm"
            >
              Logout
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

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No restaurants yet.</p>
            <button
              onClick={() => navigate('/admin/restaurants/new')}
              className="mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
            >
              Add your first restaurant
            </button>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cuisine</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Cutoff</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">API Key</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
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
                        {CUISINE_LABELS[r.cuisine_type] || r.cuisine_type}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{r.department_store} {r.floor}</span>
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-sm text-gray-600">{r.order_cutoff_time}</span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded font-mono">
                          {showKeyFor === r.id ? r.api_key : '••••••••'}
                        </code>
                        <button
                          onClick={() => setShowKeyFor(showKeyFor === r.id ? null : r.id)}
                          className="text-xs text-gray-500 hover:text-gray-700"
                        >
                          {showKeyFor === r.id ? 'Hide' : 'Show'}
                        </button>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => navigate(`/admin/restaurants/${r.id}/edit`)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => openStaffModal(r)}
                          className="text-sm text-purple-600 hover:text-purple-800 font-medium"
                        >
                          Staff
                        </button>
                        <button
                          onClick={() => handleRegenerateKey(r.id)}
                          className="text-sm text-orange-600 hover:text-orange-800 font-medium"
                        >
                          Key
                        </button>
                        <button
                          onClick={() => handleDelete(r.id)}
                          className="text-sm text-red-600 hover:text-red-800 font-medium"
                        >
                          Delete
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
                Staff: {staffModalRestaurant.name}
              </h2>
              <button
                onClick={() => setStaffModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ×
              </button>
            </div>

            <div className="p-4 overflow-auto flex-1">
              {/* Add staff form */}
              <div className="bg-gray-50 rounded-lg p-3 mb-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-2">Add Staff Member</h3>
                <div className="grid grid-cols-1 gap-2">
                  <input
                    type="text"
                    placeholder="Name (e.g. 王小明)"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <input
                    type="text"
                    placeholder="LINE User ID"
                    value={newStaffLineId}
                    onChange={(e) => setNewStaffLineId(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  />
                  <select
                    value={newStaffRole}
                    onChange={(e) => setNewStaffRole(e.target.value)}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="staff">Staff</option>
                    <option value="manager">Manager</option>
                  </select>
                  <button
                    onClick={addStaff}
                    disabled={!newStaffName.trim() || !newStaffLineId.trim()}
                    className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition disabled:opacity-50"
                  >
                    Add Staff
                  </button>
                </div>
              </div>

              {/* Staff list */}
              {staffLoading ? (
                <div className="flex justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-green-500"></div>
                </div>
              ) : staffList.length === 0 ? (
                <p className="text-gray-500 text-sm text-center py-4">No staff members yet.</p>
              ) : (
                <div className="space-y-2">
                  {staffList.map(s => (
                    <div key={s.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                      <div>
                        <p className="font-medium text-sm text-gray-800">{s.name}</p>
                        <p className="text-xs text-gray-500">{s.line_user_id}</p>
                        <p className="text-xs text-gray-400">{s.role} · {s.is_active ? 'Active' : 'Inactive'}</p>
                      </div>
                      <button
                        onClick={() => removeStaff(s.id)}
                        className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1"
                      >
                        Remove
                      </button>
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
