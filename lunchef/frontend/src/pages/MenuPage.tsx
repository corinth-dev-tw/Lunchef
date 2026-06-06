import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, UtensilsCrossed, Salad, Minus, Plus, Calendar } from 'lucide-react'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  category: string
  image_url?: string
}

interface CartItem extends MenuItem {
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
  image_url?: string
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

export default function MenuPage() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    // Restore cart from sessionStorage on mount
    const saved = sessionStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cutoffWarning, setCutoffWarning] = useState('')

  const orderDate = sessionStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0]

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails()
      fetchMenuItems()
    }
  }, [restaurantId])

  // Persist cart to sessionStorage whenever it changes
  useEffect(() => {
    if (cart.length > 0) {
      sessionStorage.setItem('cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart-updated'))
    }
  }, [cart])

  useEffect(() => {
    if (restaurant) {
      const passed = isCutoffPassed(restaurant.order_cutoff_time, orderDate)
      if (passed) {
        setCutoffWarning(`${orderDate} 的訂單已截止。截止時間為 ${restaurant.order_cutoff_time}。`)
      } else {
        setCutoffWarning('')
      }
    }
  }, [restaurant, orderDate])

  const fetchRestaurantDetails = async () => {
    try {
      const data = await api.get<Restaurant>(`/api/restaurants/${restaurantId}`)
      setRestaurant(data)
    } catch (err: any) {
      console.error('Error fetching restaurant:', err)
      setError(err.message || 'Failed to load restaurant')
    }
  }

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<MenuItem[]>(`/api/menu?restaurant_id=${restaurantId}`)
      setMenuItems(data)
    } catch (err: any) {
      console.error('Error fetching menu:', err)
      setError(err.message || 'Failed to load menu')
    } finally {
      setLoading(false)
    }
  }

  const getItemQuantity = (itemId: number): number => {
    const item = cart.find(i => i.id === itemId)
    return item ? item.quantity : 0
  }

  const addToCart = (item: MenuItem) => {
    if (cutoffWarning) return
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...item, quantity: 1, specialRequests: '' }]
    })
  }

  const removeFromCart = (itemId: number) => {
    setCart(prev => prev.filter(i => i.id !== itemId))
  }

  const updateQuantity = (item: MenuItem, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(item.id)
      return
    }
    setCart(prev => {
      const existing = prev.find(i => i.id === item.id)
      if (existing) {
        return prev.map(i => i.id === item.id ? { ...i, quantity } : i)
      }
      return [...prev, { ...item, quantity, specialRequests: '' }]
    })
  }

  const getCartTotal = () => {
    return cart.reduce((total, item) => total + item.price * item.quantity, 0)
  }

  const getCartItemCount = () => {
    return cart.reduce((count, item) => count + item.quantity, 0)
  }

  const goToCart = () => {
    sessionStorage.setItem('cart', JSON.stringify(cart))
    sessionStorage.setItem('restaurant', JSON.stringify(restaurant))
    window.dispatchEvent(new Event('cart-updated'))
    navigate('/cart')
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
          onClick={() => { fetchRestaurantDetails(); fetchMenuItems(); }}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      {/* Restaurant Header */}
      <header className="bg-white shadow-sm">
        <div className="relative h-40 bg-gray-200 overflow-hidden">
          {restaurant?.image_url ? (
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
              <UtensilsCrossed className="w-20 h-20 text-gray-300" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button
            onClick={() => navigate('/restaurants')}
            className="absolute top-4 left-4 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-xl font-bold">{restaurant?.name}</h1>
            <p className="text-sm opacity-90">{restaurant?.department_store} {restaurant?.floor}</p>
          </div>
        </div>

        {/* Date & Cutoff Info Bar */}
        <div className="px-4 py-2 flex items-center justify-between bg-white border-b">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">
              {orderDate === new Date().toISOString().split('T')[0] ? '今天' : orderDate}
            </span>
          </div>
          <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full font-medium">
            截止 {restaurant?.order_cutoff_time}
          </span>
        </div>
      </header>

      {/* Cutoff Warning */}
      {cutoffWarning && (
        <div className="mx-4 mt-3 bg-red-100 border border-red-300 rounded-lg p-3">
          <p className="text-red-800 text-sm font-bold">{cutoffWarning}</p>
        </div>
      )}

      {/* Menu Items */}
      <div className="p-4 space-y-4">
        {menuItems.map(item => {
          const quantity = getItemQuantity(item.id)
          return (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="flex">
                {/* Image placeholder */}
                <div className="w-24 h-24 flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <Salad className="w-10 h-10 text-gray-300" />
                  )}
                </div>
                <div className="flex-1 p-3 flex flex-col justify-between">
                  <div>
                    <h3 className="font-bold text-gray-800 text-sm">{item.name}</h3>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{item.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <p className="text-base font-bold text-green-600">{formatPrice(item.price)}</p>
                    {/* Always show - 0 + controls */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item, quantity - 1)}
                        disabled={quantity <= 0}
                        className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center font-bold text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <span className="font-bold w-6 text-center text-sm">{quantity}</span>
                      <button
                        onClick={() => quantity === 0 ? addToCart(item) : updateQuantity(item, quantity + 1)}
                        disabled={!!cutoffWarning}
                        className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Cart Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t shadow-lg z-[60] px-4 py-3 safe-area-pb">
          <div className="flex justify-between items-center mb-2">
            <div>
              <span className="font-bold text-gray-800">{getCartItemCount()} 份</span>
              <span className="text-gray-400 mx-2">·</span>
              <span className="text-xs text-gray-500">
                {orderDate === new Date().toISOString().split('T')[0] ? '今天' : orderDate}
              </span>
            </div>
            <span className="font-bold text-lg text-green-600">{formatPrice(getCartTotal())}</span>
          </div>
          <button
            onClick={goToCart}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-xl transition active:scale-[0.98]"
          >
            查看購物車
          </button>
        </div>
      )}
    </div>
  )
}
