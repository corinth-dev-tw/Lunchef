import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'
import { ArrowLeft, CheckCircle } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { ShimmerButton } from '../components/magicui/shimmer-button'
import { formatDate } from '../lib/dateUtils'

interface OrderResponse {
  success: boolean
  order_id: number
  order_number: string
  total_amount: number
  total_items: number
  status: string
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`
}

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  let cart: { id: number; name: string; price: number; quantity: number; specialRequests: string }[] = []
  let restaurant: { id: number; name: string } = { id: 0, name: '' }
  let pickupTime: string | null = null
  let paymentMethod = 'cash'
  let orderDate: string | null = null
  let companyName = ''
  let taxId = ''

  try {
    cart = JSON.parse(sessionStorage.getItem('cart') || '[]')
    restaurant = JSON.parse(sessionStorage.getItem('restaurant') || '{}')
    pickupTime = sessionStorage.getItem('pickupTime')
    paymentMethod = sessionStorage.getItem('paymentMethod') || 'cash'
    orderDate = sessionStorage.getItem('orderDate')
    companyName = sessionStorage.getItem('orderCompanyName') || user?.company_name || ''
    taxId = sessionStorage.getItem('orderTaxId') || user?.tax_id || ''
  } catch {
    // invalid session
  }

  const getCartTotal = () => cart.reduce((t, i) => t + i.price * i.quantity, 0)

  const submitOrder = async () => {
    if (!user) { setError('請先登入'); return }
    if (!pickupTime || !orderDate || cart.length === 0) { setError('訂單資訊不完整，請返回重試。'); return }
    if (!companyName.trim() || !taxId.trim()) { setError('請填寫公司名稱與統一編號'); return }

    setLoading(true)
    setError('')

    try {
      const locationId = sessionStorage.getItem('selectedLocationId')
      if (!locationId) throw new Error('尚未選擇取餐地點')

      const data = await api.post<OrderResponse>('/api/orders', {
        company_id: user.company_id,
        user_id: user.id,
        restaurant_id: restaurant.id,
        location_id: parseInt(locationId),
        pickup_time: pickupTime,
        order_date: orderDate,
        items: cart.map((i) => ({
          menu_item_id: i.id,
          quantity: i.quantity,
          special_requests: i.specialRequests,
        })),
        payment_method: paymentMethod,
        company_name: companyName,
        tax_id: taxId,
      })

      // Fire confetti
      try {
        const { default: confetti } = await import('canvas-confetti')
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#10b981', '#6ee7b7', '#34d399', '#fff'] })
      } catch { /* ignore */ }

      // Clear cart
      sessionStorage.removeItem('cart')
      sessionStorage.removeItem('restaurant')
      sessionStorage.removeItem('pickupTime')
      sessionStorage.removeItem('paymentMethod')
      sessionStorage.removeItem('orderDate')
      sessionStorage.removeItem('orderCompanyName')
      sessionStorage.removeItem('orderTaxId')
      window.dispatchEvent(new Event('cart-updated'))

      setSuccess(true)
      setTimeout(() => navigate(`/orders/${data.order_id}`), 1800)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '下單失敗，請重試'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  // Success screen
  if (success) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6 bg-gradient-to-b from-green-50 to-white">
        <div className="text-center">
          <CheckCircle className="w-20 h-20 text-green-500 mx-auto mb-4" strokeWidth={1.5} />
          <h1 className="text-2xl font-bold text-gray-800 mb-2">訂單已成立！</h1>
          <p className="text-gray-500 text-sm">正在前往訂單詳情...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-40">
        <button
          onClick={() => navigate('/cart')}
          className="text-gray-600 mb-2 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 返回修改
        </button>
        <h1 className="text-xl font-bold text-gray-800">確認訂單</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Order Summary */}
        <BlurFade delay={0}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-4">訂單摘要</h2>
            <div className="space-y-2.5 text-sm">
              {[
                { label: '餐廳', value: restaurant?.name },
                { label: '日期', value: orderDate ? formatDate(orderDate) : '-' },
                { label: '取餐時間', value: pickupTime ?? '-' },
                { label: '付款方式', value: paymentMethod === 'cash' ? '取餐付現' : '現場刷卡' },
                { label: '公司', value: companyName || '-' },
                { label: '統一編號', value: taxId || '-' },
              ].map(({ label, value }) => (
                <div key={label} className="flex justify-between items-center">
                  <span className="text-gray-500">{label}</span>
                  <span className="font-medium text-gray-800">{value}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-50">
              <h3 className="font-bold text-gray-700 mb-2 text-sm">餐點</h3>
              {cart.map((item) => (
                <div key={item.id} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600">{item.name} × {item.quantity}</span>
                  <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between items-center">
              <span className="font-bold text-gray-800">總計</span>
              <span className="font-bold text-2xl text-green-600">{formatPrice(getCartTotal())}</span>
            </div>
          </div>
        </BlurFade>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Submit */}
        {loading ? (
          <button disabled className="w-full bg-green-400 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 text-base">
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            處理中...
          </button>
        ) : (
          <ShimmerButton
            onClick={submitOrder}
            className="w-full py-4 font-bold text-base"
            background="rgb(22 163 74)"
            borderRadius="14px"
          >
            確認下單
          </ShimmerButton>
        )}
      </div>
    </div>
  )
}
