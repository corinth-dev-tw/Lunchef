import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'

interface Order {
  id: number
  order_number: string
  restaurant_name: string
  location_name: string
  total_amount: number
  status: string
  pickup_time: string
  order_date: string
  created_at: string
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  arrived: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

export default function OrderHistoryPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) {
      fetchOrders()
    }
  }, [user])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Order[]>(`/api/orders?company_id=${user?.company_id}`)
      setOrders(data)
    } catch (err: any) {
      console.error('Error fetching orders:', err)
      setError(err.message || 'Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchOrders}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/')} className="text-gray-600 mb-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">Order History</h1>
      </header>

      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-600">No orders yet.</p>
            <button
              onClick={() => navigate('/locations')}
              className="mt-4 bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
            >
              Order Now
            </button>
          </div>
        ) : (
          orders.map(order => (
            <button
              key={order.id}
              onClick={() => navigate(`/orders/${order.id}`)}
              className="w-full bg-white text-left p-4 rounded-lg shadow-sm border border-gray-200 hover:bg-gray-50 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <div>
                  <p className="font-bold text-gray-800">{order.order_number}</p>
                  <p className="text-sm text-gray-600">{order.restaurant_name}</p>
                </div>
                <span className={`px-2 py-1 rounded text-xs font-bold ${statusColors[order.status] || 'bg-gray-100'}`}>
                  {order.status}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Pickup: {order.order_date} {order.pickup_time}</span>
                <span className="font-bold">${order.total_amount}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
