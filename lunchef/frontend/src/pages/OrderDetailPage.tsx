import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, RotateCcw } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { NumberTicker } from '../components/magicui/number-ticker'
import { OrderStatusStepper } from '../components/OrderStatusStepper'
import { formatDate, formatDateTime } from '../lib/dateUtils'

interface OrderDetail {
  id: number
  order_number: string
  restaurant_name: string
  restaurant_id?: number
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
    menu_item_id?: number
    quantity: number
    unit_price: number
    special_requests: string
  }>
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
    if (orderId) fetchOrderDetail()
  }, [orderId])

  const fetchOrderDetail = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<OrderDetail>(`/api/orders/${orderId}`)
      setOrder(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const handleReorder = () => {
    if (!order) return
    // Restore cart items
    const cartItems = order.items.map((item) => ({
      id: item.menu_item_id ?? item.id,
      name: item.menu_item_name,
      price: item.unit_price,
      quantity: item.quantity,
      specialRequests: item.special_requests ?? '',
    }))
    sessionStorage.setItem('cart', JSON.stringify(cartItems))
    window.dispatchEvent(new Event('cart-updated'))
    const restaurantId = order.restaurant_id ?? order.id // fallback
    navigate(`/menu/${restaurantId}`)
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button onClick={fetchOrderDetail} className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg">
          重試
        </button>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <p className="text-gray-500">找不到此訂單。</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-6">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-40">
        <button onClick={() => navigate('/orders')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">訂單詳情</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Status Card */}
        <BlurFade delay={0}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <p className="text-2xl font-bold text-gray-800">{order.order_number}</p>
                <p className="text-sm text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</p>
              </div>
            </div>
            <OrderStatusStepper status={order.status} />
            {order.cancellation_reason && (
              <div className="mt-3 bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-600 font-medium">取消原因：{order.cancellation_reason}</p>
              </div>
            )}
          </div>
        </BlurFade>

        {/* Order Info */}
        <BlurFade delay={0.06}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">訂單資訊</h2>
            <div className="space-y-2 text-sm">
              {[
                { label: '餐廳', value: order.restaurant_name },
                { label: '取餐地點', value: order.location_name },
                { label: '取餐時間', value: `${formatDate(order.order_date)} ${order.pickup_time}` },
                { label: '公司', value: order.company_name },
                { label: '訂餐人', value: order.user_name },
                { label: '付款方式', value: order.payment_method === 'cash' ? '取餐付現' : '現場刷卡' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-start gap-2">
                  <span className="text-gray-400 flex-shrink-0">{label}</span>
                  <span className="text-gray-800 font-medium text-right">{value}</span>
                </div>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* Items */}
        <BlurFade delay={0.12}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3">餐點</h2>
            <div className="space-y-3">
              {order.items.map((item) => (
                <div key={item.id} className="flex justify-between items-start">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-800 text-sm">{item.menu_item_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      數量：{item.quantity} × {formatPrice(item.unit_price)}
                    </p>
                    {item.special_requests && (
                      <p className="text-xs text-orange-500 mt-0.5">備注：{item.special_requests}</p>
                    )}
                  </div>
                  <p className="font-bold text-gray-800 text-sm flex-shrink-0 ml-2">
                    {formatPrice(item.unit_price * item.quantity)}
                  </p>
                </div>
              ))}
            </div>
            <div className="mt-4 pt-4 border-t border-gray-50 flex justify-between items-center">
              <span className="font-bold text-gray-800">總計</span>
              <div className="flex items-center gap-1 font-bold text-xl text-green-600">
                $<NumberTicker value={order.total_amount} className="text-green-600" />
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Reorder button for completed orders */}
        {order.status === 'completed' && (
          <BlurFade delay={0.18}>
            <button
              onClick={handleReorder}
              className="w-full flex items-center justify-center gap-2 bg-white border-2 border-green-500 text-green-600 font-bold py-3.5 rounded-2xl hover:bg-green-50 transition active:scale-[0.99]"
            >
              <RotateCcw className="w-4 h-4" />
              再次訂購相同餐點
            </button>
          </BlurFade>
        )}
      </div>
    </div>
  )
}
