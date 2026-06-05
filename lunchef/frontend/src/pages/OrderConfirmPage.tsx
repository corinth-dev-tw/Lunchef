import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'
import { ArrowLeft } from 'lucide-react'

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

function getDateLabel(dateStr: string): string {
  const today = new Date().toISOString().split('T')[0]
  const tomorrow = new Date(Date.now() + 86400000).toISOString().split('T')[0]
  if (dateStr === today) return 'Today'
  if (dateStr === tomorrow) return 'Tomorrow'
  return new Date(dateStr).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
}

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  let cart: any[] = []
  let restaurant: any = {}
  let pickupTime: string | null = null
  let paymentMethod: string = 'cash'
  let orderDate: string | null = null
  let companyName: string = ''
  let taxId: string = ''

  try {
    cart = JSON.parse(sessionStorage.getItem('cart') || '[]')
    restaurant = JSON.parse(sessionStorage.getItem('restaurant') || '{}')
    pickupTime = sessionStorage.getItem('pickupTime')
    paymentMethod = sessionStorage.getItem('paymentMethod') || 'cash'
    orderDate = sessionStorage.getItem('orderDate')
    companyName = sessionStorage.getItem('orderCompanyName') || user?.company_name || ''
    taxId = sessionStorage.getItem('orderTaxId') || user?.tax_id || ''
  } catch {
    // Invalid session data
  }

  const getCartTotal = () => {
    return cart.reduce((total: number, item: any) => total + item.price * item.quantity, 0)
  }

  const submitOrder = async () => {
    if (!user) {
      setError('Please login first')
      return
    }

    if (!pickupTime || !orderDate || cart.length === 0) {
      setError('Missing order information. Please go back and try again.')
      return
    }

    if (!companyName.trim() || !taxId.trim()) {
      setError('Company name and tax ID are required')
      return
    }

    setLoading(true)
    setError('')

    try {
      const items = cart.map((item: any) => ({
        menu_item_id: item.id,
        quantity: item.quantity,
        special_requests: item.specialRequests
      }))

      const locationId = sessionStorage.getItem('selectedLocationId')
      if (!locationId) {
        throw new Error('Location not selected')
      }

      const data = await api.post<OrderResponse>('/api/orders', {
        company_id: user.company_id,
        user_id: user.id,
        restaurant_id: restaurant.id,
        location_id: parseInt(locationId),
        pickup_time: pickupTime,
        order_date: orderDate,
        items,
        payment_method: paymentMethod,
        company_name: companyName,
        tax_id: taxId
      })

      // Clear cart
      sessionStorage.removeItem('cart')
      sessionStorage.removeItem('restaurant')
      sessionStorage.removeItem('pickupTime')
      sessionStorage.removeItem('paymentMethod')
      sessionStorage.removeItem('orderDate')
      sessionStorage.removeItem('orderCompanyName')
      sessionStorage.removeItem('orderTaxId')
      window.dispatchEvent(new Event('cart-updated'))

      // Navigate to order detail
      navigate(`/orders/${data.order_id}`)

    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
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
        <h1 className="text-xl font-bold text-gray-800">Confirm Order</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-xl shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Order Summary</h2>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant</span>
              <span className="font-medium">{restaurant?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Date</span>
              <span className="font-medium">{orderDate ? getDateLabel(orderDate) : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time</span>
              <span className="font-medium">{pickupTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment</span>
              <span className="font-medium">{paymentMethod === 'cash' ? 'Cash on Pickup' : 'Credit Card (on-site)'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company</span>
              <span className="font-medium">{companyName || '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax ID</span>
              <span className="font-medium">{taxId || '-'}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-bold mb-2">Items</h3>
            {cart.map((item: any) => (
              <div key={item.id} className="flex justify-between py-1 text-sm">
                <span>{item.name} × {item.quantity}</span>
                <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl text-green-600">{formatPrice(getCartTotal())}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={submitOrder}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-xl transition disabled:opacity-50 active:scale-[0.98]"
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}
