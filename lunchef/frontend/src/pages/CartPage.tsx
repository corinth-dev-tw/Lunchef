import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { ArrowLeft } from 'lucide-react'

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
  const currentHour = now.getHours()
  const currentMinute = now.getMinutes()

  return currentHour > cutoffHour || (currentHour === cutoffHour && currentMinute >= cutoffMinute)
}

function getDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return '今天'
  if (dateStr === tomorrow) return '明天'
  return new Date(dateStr).toLocaleDateString('zh-TW', { month: 'long', day: 'numeric', weekday: 'short' })
}

export default function CartPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [cart, setCart] = useState<CartItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [selectedPickupTime, setSelectedPickupTime] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')
  const [companyName, setCompanyName] = useState(() => {
    return sessionStorage.getItem('orderCompanyName') || user?.company_name || ''
  })
  const [taxId, setTaxId] = useState(() => {
    return sessionStorage.getItem('orderTaxId') || user?.tax_id || ''
  })
  const orderDate = sessionStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart')
    const savedRestaurant = sessionStorage.getItem('restaurant')

    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant))
  }, [])

  // Sync company info from user if not already set
  useEffect(() => {
    if (user && !companyName && !sessionStorage.getItem('orderCompanyName')) {
      setCompanyName(user.company_name || '')
    }
    if (user && !taxId && !sessionStorage.getItem('orderTaxId')) {
      setTaxId(user.tax_id || '')
    }
  }, [user])

  useEffect(() => {
    sessionStorage.setItem('orderCompanyName', companyName)
  }, [companyName])

  useEffect(() => {
    sessionStorage.setItem('orderTaxId', taxId)
  }, [taxId])

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const updateSpecialRequests = (itemId: number, requests: string) => {
    setCart(prev => {
      const updated = prev.map(item =>
        item.id === itemId ? { ...item, specialRequests: requests } : item
      )
      sessionStorage.setItem('cart', JSON.stringify(updated))
      return updated
    })
  }

  const canSubmit = () => {
    if (!selectedPickupTime) return false
    if (!restaurant) return false
    if (isCutoffPassed(restaurant.order_cutoff_time, orderDate)) return false
    if (!companyName.trim()) return false
    if (!taxId.trim()) return false

    const itemCount = getCartItemCount()
    const totalAmount = getCartTotal()

    if (restaurant.min_order_type === 'items' && itemCount < restaurant.min_order_value) {
      return false
    }

    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value) {
      return false
    }

    return true
  }

  const getSubmitBlockerMessage = (): string => {
    if (!restaurant) return ''
    if (isCutoffPassed(restaurant.order_cutoff_time, orderDate)) {
      return `${getDateLabel(orderDate)}的訂單已截止。截止時間為 ${restaurant.order_cutoff_time}。`
    }
    const itemCount = getCartItemCount()
    const totalAmount = getCartTotal()
    if (restaurant.min_order_type === 'items' && itemCount < restaurant.min_order_value) {
      return `還需要 ${restaurant.min_order_value - itemCount} 個品項（最低：${restaurant.min_order_value} 份）`
    }
    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value) {
      return `還需要 ${formatPrice(restaurant.min_order_value - totalAmount)} 才能訂購（最低：${formatPrice(restaurant.min_order_value)}）`
    }
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

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <header className="bg-white shadow-sm p-4">
        <button
          onClick={() => restaurant ? navigate(`/menu/${restaurant.id}`) : navigate('/restaurants')}
          className="text-gray-600 mb-2 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> 返回菜單
        </button>
        <h1 className="text-xl font-bold text-gray-800">確認訂單</h1>
        {restaurant && (
          <p className="text-sm text-gray-500 mt-1">
            {restaurant.name} · {getDateLabel(orderDate)}
          </p>
        )}
      </header>

      <div className="p-4 space-y-4">
        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">餐點</h2>
          {cart.map(item => (
            <div key={item.id} className="mb-4 pb-4 border-b last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-gray-600">數量：{item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
              </div>
              <input
                type="text"
                placeholder="備注（選填）"
                value={item.specialRequests}
                onChange={(e) => updateSpecialRequests(item.id, e.target.value)}
                className="mt-2 w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                maxLength={200}
              />
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-bold text-lg">總計</span>
            <span className="font-bold text-lg text-green-600">{formatPrice(getCartTotal())}</span>
          </div>
        </div>

        {/* Company Info */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">公司資訊</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">公司名稱</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="例如：台積電"
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                maxLength={100}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">統一編號</label>
              <input
                type="text"
                value={taxId}
                onChange={(e) => setTaxId(e.target.value)}
                placeholder="例如：12345678"
                className="w-full p-3 border rounded-xl text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                maxLength={20}
              />
            </div>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">取餐時間</h2>
          <div className="grid grid-cols-3 gap-2">
            {restaurant?.pickup_times.map(time => (
              <button
                key={time}
                onClick={() => setSelectedPickupTime(time)}
                className={`p-3 rounded-xl border-2 font-bold transition ${
                  selectedPickupTime === time
                    ? 'border-green-500 bg-green-50 text-green-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {time}
              </button>
            ))}
          </div>
        </div>

        {/* Payment Method */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">付款方式</h2>
          <div className="space-y-2">
            <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition">
              <input
                type="radio"
                name="payment"
                value="cash"
                checked={selectedPaymentMethod === 'cash'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="mr-3"
              />
              <span>取餐付現</span>
            </label>
            <label className="flex items-center p-3 border rounded-xl cursor-pointer hover:bg-gray-50 transition">
              <input
                type="radio"
                name="payment"
                value="credit_card"
                checked={selectedPaymentMethod === 'credit_card'}
                onChange={(e) => setSelectedPaymentMethod(e.target.value)}
                className="mr-3"
              />
              <span>現場刷卡</span>
            </label>
          </div>
        </div>

        {/* Submit Blocker Warning */}
        {getSubmitBlockerMessage() && (
          <div className="bg-orange-100 border border-orange-300 rounded-xl p-3">
            <p className="text-orange-800 text-sm font-bold">{getSubmitBlockerMessage()}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={goToConfirm}
          disabled={!canSubmit()}
          className={`w-full font-bold py-4 px-4 rounded-xl transition ${
            canSubmit()
              ? 'bg-green-500 hover:bg-green-600 text-white active:scale-[0.98]'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          前往確認
        </button>
      </div>
    </div>
  )
}
