import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft } from 'lucide-react'

interface OrderDetail {
  id: number
  order_number: string
  restaurant_name: string
  location_name: string
  company_name: string
  user_name: string
  total_amount: number
  status: string
  pickup_time: string
  order_date: string
  payment_method: string
  cancellation_reason: string
  created_at: string
  items: Array<{
    id: number
    menu_item_name: string
    quantity: number
    unit_price: number
    special_requests: string
  }>
}

const statusColors: Record<string, string> = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  preparing: 'bg-orange-100 text-orange-800',
  arrived: 'bg-purple-100 text-purple-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800'
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`
}

export default function OrderDetailPage() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail()
    }
  }, [orderId])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<OrderDetail>(`/api/orders/${orderId}`)
      setOrder(data)
    } catch (err: any) {
      console.error('Error fetching order:', err)
      setError(err.message || 'Failed to load order')
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
          onClick={fetchOrderDetail}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          Retry
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-600">Order not found.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/orders')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">Order Details</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Order Header */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <div className="flex justify-between items-start mb-3">
            <div>
              <p className="text-2xl font-bold text-gray-800">{order.order_number}</p>
              <p className="text-sm text-gray-600">{new Date(order.created_at).toLocaleString('zh-TW')}</p>
            </div>
            <span className={`px-3 py-1 rounded text-sm font-bold ${statusColors[order.status]}`}>
              {order.status}
            </span>
          </div>
        </div>

        {/* Order Info */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Order Information</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant</span>
              <span>{order.restaurant_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Location</span>
              <span>{order.location_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time</span>
              <span>{order.order_date} {order.pickup_time}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company</span>
              <span>{order.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Ordered By</span>
              <span>{order.user_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment</span>
              <span>{order.payment_method === 'cash' ? 'Cash' : 'Credit Card'}</span>
            </div>
            {order.cancellation_reason && (
              <div className="flex justify-between">
                <span className="text-gray-600">Cancellation Reason</span>
                <span className="text-red-600">{order.cancellation_reason}</span>
              </div>
            )}
          </div>
        </div>

        {/* Items */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Items</h2>
          <div className="space-y-3">
            {order.items.map(item => (
              <div key={item.id} className="flex justify-between items-start">
                <div>
                  <p className="font-bold">{item.menu_item_name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatPrice(item.unit_price)}</p>
                  {item.special_requests && (
                    <p className="text-sm text-orange-600 mt-1">Note: {item.special_requests}</p>
                  )}
                </div>
                <p className="font-bold">{formatPrice(item.unit_price * item.quantity)}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl text-green-600">{formatPrice(order.total_amount)}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
