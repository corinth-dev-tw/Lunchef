import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'
import { ArrowLeft } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { RippleButton } from '../components/magicui/ripple-button'
import { AnimatedShinyText } from '../components/magicui/animated-shiny-text'
import { OrderStatusStepper } from '../components/OrderStatusStepper'
import { formatDateTime } from '../lib/dateUtils'

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

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`
}

const STATUS_ACTIVE = new Set(['pending', 'confirmed', 'preparing'])

export default function OrderHistoryPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (user) fetchOrders()
  }, [user])

  const fetchOrders = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Order[]>(`/api/orders?company_id=${user?.company_id}`)
      setOrders(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    } finally {
      setLoading(false)
    }
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
        <RippleButton
          onClick={fetchOrders}
          className="border-green-500 bg-green-500 text-white font-bold"
          rippleColor="#ffffff"
        >
          重試
        </RippleButton>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-40">
        <button onClick={() => navigate('/')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">訂單紀錄</h1>
      </header>

      <div className="p-4 space-y-3">
        {orders.length === 0 ? (
          <BlurFade delay={0}>
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-3xl">🍱</span>
              </div>
              <p className="text-gray-600 font-medium mb-1">尚無訂單</p>
              <p className="text-gray-400 text-sm mb-6">來點好料吧！</p>
              <RippleButton
                onClick={() => navigate('/')}
                className="border-green-500 bg-green-500 text-white font-bold px-6 py-2.5 text-sm"
                rippleColor="#ffffff"
              >
                立即訂餐
              </RippleButton>
            </div>
          </BlurFade>
        ) : (
          orders.map((order, index) => (
            <BlurFade key={order.id} delay={index * 0.05}>
              <button
                onClick={() => navigate(`/orders/${order.id}`)}
                className="w-full bg-white text-left p-4 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
              >
                {/* Top row */}
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="font-bold text-gray-800">{order.order_number}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{order.restaurant_name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatDateTime(order.created_at)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-800">{formatPrice(order.total_amount)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      取餐：{order.order_date} {order.pickup_time}
                    </p>
                  </div>
                </div>

                {/* Status stepper */}
                <div className="mb-3">
                  {STATUS_ACTIVE.has(order.status) ? (
                    <AnimatedShinyText className="text-xs font-medium text-green-600 mb-1.5 block">
                      {order.status === 'pending' ? '等待餐廳確認中...' :
                       order.status === 'confirmed' ? '已確認，準備中...' : '餐點準備中...'}
                    </AnimatedShinyText>
                  ) : null}
                  <OrderStatusStepper status={order.status} compact />
                </div>

                {/* Location */}
                <p className="text-xs text-gray-400">{order.location_name}</p>
              </button>
            </BlurFade>
          ))
        )}
      </div>
    </div>
  )
}
