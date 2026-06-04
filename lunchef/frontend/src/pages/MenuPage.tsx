import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

interface MenuItem {
  id: number
  name: string
  description: string
  price: number
  category: string
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
}

export default function MenuPage() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [cart, setCart] = useState<CartItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails()
      fetchMenuItems()
    }
  }, [restaurantId])

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

  const addToCart = (item: MenuItem) => {
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

  const updateQuantity = (itemId: number, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(itemId)
      return
    }
    setCart(prev => prev.map(i => i.id === itemId ? { ...i, quantity } : i))
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
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/restaurants')} className="text-gray-600 mb-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">{restaurant?.name}</h1>
        <p className="text-sm text-gray-600">{restaurant?.department_store} {restaurant?.floor}</p>
      </header>

      <div className="p-4 space-y-3">
        {menuItems.map(item => {
          const cartItem = cart.find(i => i.id === item.id)
          return (
            <div key={item.id} className="bg-white p-4 rounded-lg shadow-sm border border-gray-200">
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800">{item.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{item.description}</p>
                  <p className="text-lg font-bold text-green-600 mt-2">${item.price}</p>
                </div>
              </div>

              {cartItem ? (
                <div className="flex items-center mt-3 gap-3">
                  <button
                    onClick={() => updateQuantity(item.id, cartItem.quantity - 1)}
                    className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center font-bold"
                  >
                    -
                  </button>
                  <span className="font-bold w-8 text-center">{cartItem.quantity}</span>
                  <button
                    onClick={() => updateQuantity(item.id, cartItem.quantity + 1)}
                    className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold"
                  >
                    +
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => addToCart(item)}
                  className="mt-3 w-full bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-4 rounded-lg transition"
                >
                  Add to Order
                </button>
              )}
            </div>
          )
        })}
      </div>

      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t p-4 shadow-lg">
          <div className="flex justify-between items-center mb-2">
            <span className="font-bold">{getCartItemCount()} items</span>
            <span className="font-bold text-lg">${getCartTotal()}</span>
          </div>
          <button
            onClick={goToCart}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Review Order
          </button>
        </div>
      )}
    </div>
  )
}
