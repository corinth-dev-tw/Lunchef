import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

interface Order {
  id: number
  order_number: string
  company_name: string
  user_name: string
  user_phone: string
  total_amount: number
  status: string
  pickup_time: string
  order_date: string
  created_at: string
}

interface Stats {
  total_orders: number
  total_revenue: number
  pending_orders: number
  confirmed_orders: number
  preparing_orders: number
  completed_orders: number
  cancelled_orders: number
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  confirmed: 'bg-blue-100 text-blue-800 border-blue-300',
  preparing: 'bg-orange-100 text-orange-800 border-orange-300',
  arrived: 'bg-purple-100 text-purple-800 border-purple-300',
  completed: 'bg-green-100 text-green-800 border-green-300',
  cancelled: 'bg-red-100 text-red-800 border-red-300'
}

const statusFlow = ['pending', 'confirmed', 'preparing', 'arrived', 'completed']

export default function OrdersPage() {
  const navigate = useNavigate()
  const { restaurantId, logout } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0])

  useEffect(() => {
    if (restaurantId) {
      fetchOrders()
      fetchStats()
    }
  }, [restaurantId, selectedDate])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Order[]>(`/api/dashboard/orders?restaurant_id=${restaurantId}&date=${selectedDate}`)
      setOrders(data)
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  const fetchStats = async () => {
    try {
      const data = await api.get<Stats>(`/api/dashboard/stats?restaurant_id=${restaurantId}&date=${selectedDate}`)
      setStats(data)
    } catch (err: any) {
      console.error('Error fetching stats:', err)
    }
  }

  const updateStatus = async (orderId: number, newStatus: string, reason?: string) => {
    try {
      await api.put(`/api/dashboard/orders/${orderId}/status`, {
        status: newStatus,
        cancellation_reason: reason,
      })
      fetchOrders()
      fetchStats()
    } catch (err: any) {
      console.error('Error updating status:', err)
      setError(err.message || 'Failed to update status')
    }
  }

  const getNextStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus)
    if (currentIndex === -1 || currentIndex === statusFlow.length - 1) return null
    return statusFlow[currentIndex + 1]
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm p-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Orders</h1>
            <p className="text-sm text-gray-600">{selectedDate}</p>
          </div>
          <button
            onClick={logout}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Logout
          </button>
        </div>
      </header>

      <div className="p-4">
        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3 mb-4">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-2xl font-bold">{stats.total_orders || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Revenue</p>
              <p className="text-2xl font-bold text-green-600">${stats.total_revenue || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Pending</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending_orders || 0}</p>
            </div>
            <div className="bg-white rounded-lg shadow-sm p-4">
              <p className="text-sm text-gray-600">Completed</p>
              <p className="text-2xl font-bold text-green-600">{stats.completed_orders || 0}</p>
            </div>
          </div>
        )}

        {/* Date Selector */}
        <div className="bg-white rounded-lg shadow-sm p-4 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Select Date
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="p-2 border border-gray-300 rounded-lg"
          />
        </div>

        {/* Orders List */}
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm p-8 text-center">
              <p className="text-gray-600">No orders for this date.</p>
            </div>
          ) : (
            orders.map(order => {
              const nextStatus = getNextStatus(order.status)
              return (
                <div key={order.id} className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                  <div className="p-4">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="font-bold text-lg">{order.order_number}</p>
                        <p className="text-sm text-gray-600">{order.company_name}</p>
                        <p className="text-sm text-gray-600">Contact: {order.user_name} ({order.user_phone})</p>
                      </div>
                      <div className="text-right">
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-bold border ${statusColors[order.status]}`}>
                          {order.status}
                        </span>
                        <p className="text-lg font-bold mt-2">${order.total_amount}</p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-sm text-gray-600">
                        Pickup: {order.pickup_time}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => navigate(`/orders/${order.id}`)}
                          className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-sm font-bold transition"
                        >
                          View
                        </button>
                        
                        {nextStatus && (
                          <button
                            onClick={() => updateStatus(order.id, nextStatus)}
                            className="px-4 py-2 bg-green-500 hover:bg-green-600 text-white rounded-lg text-sm font-bold transition"
                          >
                            Mark {nextStatus}
                          </button>
                        )}
                        
                        {order.status !== 'cancelled' && order.status !== 'completed' && (
                          <button
                            onClick={() => {
                              const reason = prompt('Cancellation reason:')
                              if (reason) updateStatus(order.id, 'cancelled', reason)
                            }}
                            className="px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-sm font-bold transition"
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </div>
  )
}
