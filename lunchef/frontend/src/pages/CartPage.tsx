import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Building2, Clock, CreditCard, AlertTriangle } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { ShimmerButton } from '../components/magicui/shimmer-button'
import { formatDate } from '../lib/dateUtils'

interface CartItem {
  id: number
  name: string
  price: number
  quantity: number
  specialRequests: string
}

interface Restaurant {
  id: number
  name: string
  department_store: string
  floor: string
  pickup_times: string[]
  min_order_type: string
  min_order_value: number
  order_cutoff_time: string
}

function formatPrice(price: number): string {
  return `$${price.toLocaleString()}`
}

function isCutoffPassed(cutoffTime: string, orderDate: string): boolean {
  const now = new Date()
  const todayStr = now.toISOString().split('T')[0]
  if (orderDate !== todayStr) return false
  const [cutoffHour, cutoffMinute] = cutoffTime.split(':').map(Number)
  return now.getHours() > cutoffHour || (now.getHours() === cutoffHour && now.getMinutes() >= cutoffMinute)
}

export default function CartPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [cart, setCart] = useState<CartItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [selectedPickupTime, setSelectedPickupTime] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')
  const [companyName, setCompanyName] = useState(() => sessionStorage.getItem('orderCompanyName') || user?.company_name || '')
  const [taxId, setTaxId] = useState(() => sessionStorage.getItem('orderTaxId') || user?.tax_id || '')
  const orderDate = sessionStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart')
    const savedRestaurant = sessionStorage.getItem('restaurant')
    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant))
  }, [])

  useEffect(() => {
    if (user && !companyName && !sessionStorage.getItem('orderCompanyName')) setCompanyName(user.company_name || '')
    if (user && !taxId && !sessionStorage.getItem('orderTaxId')) setTaxId(user.tax_id || '')
  }, [user])

  useEffect(() => { sessionStorage.setItem('orderCompanyName', companyName) }, [companyName])
  useEffect(() => { sessionStorage.setItem('orderTaxId', taxId) }, [taxId])

  const syncCart = (updated: CartItem[]) => {
    setCart(updated)
    sessionStorage.setItem('cart', JSON.stringify(updated))
    window.dispatchEvent(new Event('cart-updated'))
  }

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      syncCart(cart.filter((i) => i.id !== itemId))
    } else {
      syncCart(cart.map((i) => (i.id === itemId ? { ...i, quantity } : i)))
    }
  }

  const updateSpecialRequests = (itemId: number, requests: string) => {
    const updated = cart.map((i) => (i.id === itemId ? { ...i, specialRequests: requests } : i))
    syncCart(updated)
  }

  const getCartTotal = () => cart.reduce((t, i) => t + i.price * i.quantity, 0)
  const getCartItemCount = () => cart.reduce((c, i) => c + i.quantity, 0)

  const canSubmit = () => {
    if (!selectedPickupTime || !restaurant) return false
    if (isCutoffPassed(restaurant.order_cutoff_time, orderDate)) return false
    if (!companyName.trim() || !taxId.trim()) return false
    if (cart.length === 0) return false
    const itemCount = getCartItemCount()
    const totalAmount = getCartTotal()
    if (restaurant.min_order_type === 'items' && itemCount < restaurant.min_order_value) return false
    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value) return false
    return true
  }

  const getSubmitBlockerMessage = (): string => {
    if (!restaurant) return ''
    if (cart.length === 0) return '購物車是空的'
    if (isCutoffPassed(restaurant.order_cutoff_time, orderDate))
      return `${formatDate(orderDate)}的訂單已截止。截止時間為 ${restaurant.order_cutoff_time}。`
    const itemCount = getCartItemCount()
    const totalAmount = getCartTotal()
    if (restaurant.min_order_type === 'items' && itemCount < restaurant.min_order_value)
      return `還需要 ${restaurant.min_order_value - itemCount} 個品項（最低：${restaurant.min_order_value} 份）`
    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value)
      return `還需要 ${formatPrice(restaurant.min_order_value - totalAmount)} 才能訂購（最低：${formatPrice(restaurant.min_order_value)}）`
    if (!companyName.trim()) return '請輸入公司名稱'
    if (!taxId.trim()) return '請輸入統一編號'
    if (!selectedPickupTime) return '請選擇取餐時間'
    return ''
  }

  const goToConfirm = () => {
    sessionStorage.setItem('pickupTime', selectedPickupTime)
    sessionStorage.setItem('paymentMethod', selectedPaymentMethod)
    sessionStorage.setItem('orderDate', orderDate)
    sessionStorage.setItem('orderCompanyName', companyName)
    sessionStorage.setItem('orderTaxId', taxId)
    navigate('/order-confirm')
  }

  // Empty cart state
  if (cart.length === 0 && restaurant === null) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-6 text-center">
        <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
          <ShoppingBag className="w-8 h-8 text-green-400" />
        </div>
        <h2 className="text-lg font-bold text-gray-700 mb-2">購物車是空的</h2>
        <p className="text-gray-400 text-sm mb-6">去選幾道好料吧！</p>
        <button
          onClick={() => navigate('/')}
          className="bg-green-500 text-white font-bold py-2.5 px-6 rounded-xl"
        >
          返回首頁
        </button>
      </div>
    )
  }

  const blockerMsg = getSubmitBlockerMessage()

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-40">
        <button
          onClick={() => restaurant ? navigate(`/menu/${restaurant.id}`) : navigate('/')}
          className="text-gray-600 mb-2 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 返回菜單
        </button>
        <h1 className="text-xl font-bold text-gray-800">確認訂單</h1>
        {restaurant && (
          <p className="text-sm text-gray-400 mt-0.5">{restaurant.name} · {formatDate(orderDate)}</p>
        )}
      </header>

      <div className="p-4 space-y-4">

        {/* Order Items */}
        <BlurFade delay={0}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-gray-400" /> 餐點
            </h2>
            {cart.map((item) => (
              <div key={item.id} className="mb-4 pb-4 border-b border-gray-50 last:border-0 last:mb-0 last:pb-0">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-gray-800 truncate">{item.name}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{formatPrice(item.price)} / 份</p>
                  </div>
                  {/* Qty controls */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 active:bg-gray-200 transition"
                    >
                      {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-red-400" /> : <Minus className="w-3.5 h-3.5" />}
                    </button>
                    <span className="w-6 text-center text-sm font-bold tabular-nums">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-7 h-7 rounded-full bg-green-50 flex items-center justify-center text-green-600 active:bg-green-100 transition"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-bold text-gray-800 w-14 text-right">
                      {formatPrice(item.price * item.quantity)}
                    </span>
                  </div>
                </div>
                <input
                  type="text"
                  placeholder="備注（選填）"
                  value={item.specialRequests}
                  onChange={(e) => updateSpecialRequests(item.id, e.target.value)}
                  className="mt-2 w-full p-2 border border-gray-100 rounded-lg text-xs text-gray-600 focus:ring-1 focus:ring-green-500 focus:border-transparent outline-none bg-gray-50 placeholder-gray-300"
                  maxLength={200}
                />
              </div>
            ))}
            <div className="flex justify-between items-center pt-3 mt-1 border-t border-gray-100">
              <span className="font-bold text-gray-700">總計</span>
              <span className="font-bold text-lg text-green-600">{formatPrice(getCartTotal())}</span>
            </div>
          </div>
        </BlurFade>

        {/* Company Info */}
        <BlurFade delay={0.08}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-gray-400" /> 公司資訊
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">公司名稱</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="例如：台積電"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  maxLength={100}
                />
                {user?.company_name && (
                  <p className="text-[11px] text-gray-400 mt-1">已從您的帳號填入，可修改</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">統一編號</label>
                <input
                  type="text"
                  value={taxId}
                  onChange={(e) => setTaxId(e.target.value)}
                  placeholder="例如：12345678"
                  className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                  maxLength={20}
                />
              </div>
            </div>
          </div>
        </BlurFade>

        {/* Pickup Time */}
        <BlurFade delay={0.12}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-gray-400" /> 取餐時間
            </h2>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-1 px-1">
              {restaurant?.pickup_times.map((time) => (
                <button
                  key={time}
                  onClick={() => setSelectedPickupTime(time)}
                  className={`flex-shrink-0 px-4 py-3 rounded-xl border-2 font-bold text-sm transition ${
                    selectedPickupTime === time
                      ? 'border-green-500 bg-green-50 text-green-700'
                      : 'border-gray-200 hover:border-gray-300 text-gray-700'
                  }`}
                >
                  {time}
                </button>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* Payment Method */}
        <BlurFade delay={0.16}>
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <h2 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-gray-400" /> 付款方式
            </h2>
            <div className="space-y-2">
              {[
                { value: 'cash', label: '取餐付現', desc: '取餐時以現金支付' },
                { value: 'credit_card', label: '現場刷卡', desc: '取餐時以信用卡支付' },
              ].map(({ value, label, desc }) => (
                <label
                  key={value}
                  className={`flex items-center p-3 border-2 rounded-xl cursor-pointer transition ${
                    selectedPaymentMethod === value ? 'border-green-500 bg-green-50' : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="payment"
                    value={value}
                    checked={selectedPaymentMethod === value}
                    onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                    className="mr-3 accent-green-500"
                  />
                  <div>
                    <p className="text-sm font-bold text-gray-800">{label}</p>
                    <p className="text-xs text-gray-400">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </BlurFade>

        {/* Blocker Warning */}
        {blockerMsg && (
          <div className="bg-orange-50 border border-orange-200 rounded-xl p-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-500 flex-shrink-0" />
            <p className="text-orange-800 text-sm font-medium">{blockerMsg}</p>
          </div>
        )}

        {/* Submit */}
        {canSubmit() ? (
          <ShimmerButton
            onClick={goToConfirm}
            className="w-full py-4 font-bold text-base"
            background="rgb(22 163 74)"
            borderRadius="14px"
          >
            前往確認
          </ShimmerButton>
        ) : (
          <button
            disabled
            className="w-full bg-gray-200 text-gray-400 font-bold py-4 rounded-2xl cursor-not-allowed text-base"
          >
            前往確認
          </button>
        )}
      </div>
    </div>
  )
}
