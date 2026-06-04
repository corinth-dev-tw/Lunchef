import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'

interface OrderResponse {
  success: boolean
  order_id: number
  order_number: string
  total_amount: number
  total_items: number
  status: string
}

export default function OrderConfirmPage() {
  const navigate = useNavigate()
  const { user } = useLiff()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  let cart: any[] = []
  let restaurant: any = {}
  let pickupTime: string | null = null
  let paymentMethod: string | null = null
  let orderDate: string | null = null

  try {
    cart = JSON.parse(sessionStorage.getItem('cart') || '[]')
    restaurant = JSON.parse(sessionStorage.getItem('restaurant') || '{}')
    pickupTime = sessionStorage.getItem('pickupTime')
    paymentMethod = sessionStorage.getItem('paymentMethod')
    orderDate = sessionStorage.getItem('orderDate')
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
        payment_method: paymentMethod
      })

      // Clear cart
      sessionStorage.removeItem('cart')
      sessionStorage.removeItem('restaurant')
      sessionStorage.removeItem('pickupTime')
      sessionStorage.removeItem('paymentMethod')
      sessionStorage.removeItem('orderDate')

      // Navigate to order detail
      navigate(`/orders/${data.order_id}`)

    } catch (err: any) {
      setError(err.message || 'Failed to create order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/cart')} className="text-gray-600 mb-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">Confirm Order</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Order Summary */}
        <div className="bg-white rounded-lg shadow-sm p-4">
          <h2 className="font-bold text-gray-800 mb-3">Order Summary</h2>
          
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Restaurant</span>
              <span>{restaurant?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Pickup Time</span>
              <span>{pickupTime}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Payment</span>
              <span>{paymentMethod === 'cash' ? 'Cash' : 'Credit Card'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Company</span>
              <span>{user?.company_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Tax ID</span>
              <span>{user?.tax_id}</span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t">
            <h3 className="font-bold mb-2">Items</h3>
            {cart.map((item: any) => (
              <div key={item.id} className="flex justify-between py-1">
                <span>{item.name} × {item.quantity}</span>
                <span>${item.price * item.quantity}</span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t flex justify-between items-center">
            <span className="font-bold text-lg">Total</span>
            <span className="font-bold text-xl text-green-600">${getCartTotal()}</span>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          onClick={submitOrder}
          disabled={loading}
          className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-4 px-4 rounded-lg transition disabled:opacity-50"
        >
          {loading ? 'Processing...' : 'Place Order'}
        </button>
      </div>
    </div>
  )
}
