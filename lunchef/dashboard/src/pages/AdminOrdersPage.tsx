import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../contexts/AdminAuthContext'
import { adminApi } from '../utils/adminApi'

interface Order {
  id: number
  order_number: string
  restaurant_name: string
  company_name: string
  location_name: string
  pickup_time: string
  order_date: string
  total_amount: number
  status: string
  payment_method: string
  created_at: string
}

interface Restaurant {
  id: number
  name: string
}

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  arrived: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
}

export default function AdminOrdersPage() {
  const navigate = useNavigate()
  const { token, logout } = useAdminAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [filterDate, setFilterDate] = useState(new Date().toISOString().split('T')[0])
  const [filterRestaurant, setFilterRestaurant] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (token) {
      adminApi.setToken(token)
      fetchRestaurants()
      fetchOrders()
    }
  }, [token])

  const fetchRestaurants = async () => {
    try {
      const data = await adminApi.get<Restaurant[]>('/api/admin/restaurants')
      setRestaurants(data)
    } catch (err: any) {
      console.error('Error fetching restaurants:', err)
    }
  }

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const params = new URLSearchParams()
      if (filterDate) params.append('date', filterDate)
      if (filterRestaurant) params.append('restaurant_id', filterRestaurant)
      if (filterStatus) params.append('status', filterStatus)
      const query = params.toString() ? `?${params.toString()}` : ''
      const data = await adminApi.get<Order[]>(`/api/admin/orders${query}`)
      setOrders(data)
    } catch (err: any) {
      setError(err.message)
      if (err.message?.includes('Unauthorized')) logout()
    } finally {
      setLoading(false)
    }
  }

  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_amount || 0), 0)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
            <p className="text-sm text-gray-500">Global Order Overview</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => navigate('/admin/restaurants')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Restaurants
            </button>
            <button
              onClick={() => navigate('/admin/locations')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Locations
            </button>
            <button
              onClick={() => navigate('/admin/staff-requests')}
              className="text-gray-600 hover:text-gray-800 text-sm font-medium"
            >
              Staff Requests
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

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Date</label>
              <input
                type="date"
                value={filterDate}
                onChange={(e) => setFilterDate(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Restaurant</label>
              <select
                value={filterRestaurant}
                onChange={(e) => setFilterRestaurant(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                {restaurants.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">All</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="preparing">Preparing</option>
                <option value="arrived">Arrived</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
            <button
              onClick={fetchOrders}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
            >
              Search
            </button>
          </div>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Orders</p>
            <p className="text-2xl font-bold text-gray-800">{orders.length}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm p-4">
            <p className="text-sm text-gray-500">Total Revenue</p>
            <p className="text-2xl font-bold text-gray-800">${totalRevenue.toLocaleString()}</p>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : orders.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center">
            <p className="text-gray-500">No orders found.</p>
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Order #</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Restaurant</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Company</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Location</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Pickup</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Amount</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-600">Status</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <tr key={o.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 text-sm font-mono text-gray-700">{o.order_number}</td>
                    <td className="py-3 px-4 text-sm text-gray-800">{o.restaurant_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{o.company_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{o.location_name}</td>
                    <td className="py-3 px-4 text-sm text-gray-600">{o.pickup_time}</td>
                    <td className="py-3 px-4 text-sm font-medium text-gray-800">${o.total_amount}</td>
                    <td className="py-3 px-4">
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[o.status] || 'bg-gray-100 text-gray-800'}`}>
                        {o.status}
                      </span>
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
