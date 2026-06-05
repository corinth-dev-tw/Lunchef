import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
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
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function CartPage() {
  const navigate = useNavigate()
  const [cart, setCart] = useState<CartItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [selectedPickupTime, setSelectedPickupTime] = useState('')
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('cash')
  const orderDate = sessionStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    const savedCart = sessionStorage.getItem('cart')
    const savedRestaurant = sessionStorage.getItem('restaurant')

    if (savedCart) setCart(JSON.parse(savedCart))
    if (savedRestaurant) setRestaurant(JSON.parse(savedRestaurant))
  }, [])

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
      return `Ordering closed for ${getDateLabel(orderDate)}. Cutoff was ${restaurant.order_cutoff_time}.`
    }
    const itemCount = getCartItemCount()
    const totalAmount = getCartTotal()
    if (restaurant.min_order_type === 'items' && itemCount < restaurant.min_order_value) {
      return `Need ${restaurant.min_order_value - itemCount} more items (min: ${restaurant.min_order_value})`
    }
    if (restaurant.min_order_type === 'amount' && totalAmount < restaurant.min_order_value) {
      return `Need ${formatPrice(restaurant.min_order_value - totalAmount)} more (min: ${formatPrice(restaurant.min_order_value)})`
    }
    if (!selectedPickupTime) return 'Select a pickup time'
    return ''
  }

  const goToConfirm = () => {
    sessionStorage.setItem('pickupTime', selectedPickupTime)
    sessionStorage.setItem('paymentMethod', selectedPaymentMethod)
    sessionStorage.setItem('orderDate', orderDate)
    navigate('/order-confirm')
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-4">
      <header className="bg-white shadow-sm p-4">
        <button
          onClick={() => restaurant ? navigate(`/menu/${restaurant.id}`) : navigate('/restaurants')}
          className="text-gray-600 mb-2 flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back to menu
        </button>
        <h1 className="text-xl font-bold text-gray-800">Review Order</h1>
        {restaurant && (
          <p className="text-sm text-gray-500 mt-1">
            {restaurant.name} · {getDateLabel(orderDate)}
          </p>
        )}
      </header>

      <div className="p-4 space-y-4">
        {/* Order Items */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Items</h2>
          {cart.map(item => (
            <div key={item.id} className="mb-4 pb-4 border-b last:border-0">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <p className="font-bold">{item.name}</p>
                  <p className="text-sm text-gray-600">Qty: {item.quantity} × {formatPrice(item.price)}</p>
                </div>
                <p className="font-bold">{formatPrice(item.price * item.quantity)}</p>
              </div>
              <input
                type="text"
                placeholder="Special requests (optional)"
                value={item.specialRequests}
                onChange={(e) => updateSpecialRequests(item.id, e.target.value)}
                className="mt-2 w-full p-2 border rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none"
                maxLength={200}
              />
            </div>
          ))}
          <div className="flex justify-between items-center pt-2 border-t">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-lg text-green-600">{formatPrice(getCartTotal())}</span>
          </div>
        </div>

        {/* Pickup Time */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Pickup Time</h2>
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
          <h2 className="font-bold text-gray-800 mb-3">Payment Method</h2>
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
              <span>Cash on Pickup</span>
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
              <span>Credit Card (on-site)</span>
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
          Confirm Order
        </button>
      </div>
    </div>
  )
}
