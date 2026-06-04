import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { adminApi } from '../utils/adminApi'

interface Location {
  id: number
  name: string
  address: string
}

export default function AdminLocationsPage() {
  const navigate = useNavigate()
  const { token, logout } = useAdminAuth()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [editingId, setEditingId] = useState<number | null>(null)
  const [formName, setFormName] = useState('')
  const [formAddress, setFormAddress] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (token) {
      adminApi.setToken(token)
      fetchLocations()
    }
  }, [token])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await adminApi.get<Location[]>('/api/admin/locations')
      setLocations(data)
    } catch (err: any) {
      setError(err.message)
      if (err.message?.includes('Unauthorized')) logout()
    } finally {
      setLoading(false)
    }
  }

  const startAdd = () => {
    setEditingId(-1)
    setFormName('')
    setFormAddress('')
  }

  const startEdit = (loc: Location) => {
    setEditingId(loc.id)
    setFormName(loc.name)
    setFormAddress(loc.address)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setFormName('')
    setFormAddress('')
  }

  const handleSave = async () => {
    if (!formName.trim()) return
    setSaving(true)
    try {
      if (editingId === -1) {
        await adminApi.post('/api/admin/locations', { name: formName.trim(), address: formAddress.trim() })
      } else {
        await adminApi.put(`/api/admin/locations/${editingId}`, { name: formName.trim(), address: formAddress.trim() })
      }
      cancelEdit()
      fetchLocations()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!confirm('Delete this location?')) return
    try {
      await adminApi.delete(`/api/admin/locations/${id}`)
      fetchLocations()
    } catch (err: any) {
      setError(err.message)
    }
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Locations</h1>
            <p className="text-sm text-gray-500">Manage Office Buildings</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/restaurants')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Restaurants
            </button>
            <button
              onClick={() => navigate('/admin/orders')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Orders
            </button>
            <button
              onClick={startAdd}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              + Add Location
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

      <main className="max-w-4xl mx-auto p-4">
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {editingId !== null && (
          <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              {editingId === -1 ? 'Add Location' : 'Edit Location'}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="Location name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
              <input
                type="text"
                placeholder="Address"
                value={formAddress}
                onChange={(e) => setFormAddress(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={handleSave}
                disabled={saving || !formName.trim()}
                className="bg-green-500 hover:bg-green-600 text-white text-sm font-bold py-2 px-4 rounded transition disabled:opacity-50"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button
                onClick={cancelEdit}
                className="text-gray-500 text-sm font-medium py-2 px-4"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : locations.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No locations yet.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Address</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-gray-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map(loc => (
                  <tr key={loc.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium text-gray-800">{loc.name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{loc.address}</td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => startEdit(loc)}
                          className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(loc.id)}
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
