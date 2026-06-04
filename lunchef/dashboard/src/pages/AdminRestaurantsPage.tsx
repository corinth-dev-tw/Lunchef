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
    </div>
  )
}
