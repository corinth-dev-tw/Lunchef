import { useState, useEffect, useMemo, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, UtensilsCrossed, Salad, Minus, Plus, Calendar, Clock } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { ShimmerButton } from '../components/magicui/shimmer-button'
import { NumberTicker } from '../components/magicui/number-ticker'
import { useToast } from '../components/Toast'
import { formatDate } from '../lib/dateUtils'

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

const CATEGORY_LABELS: Record<string, string> = {
  main: '主餐',
  side: '副餐',
  drink: '飲料',
  dessert: '甜點',
}

function getCategoryLabel(cat: string): string {
  return CATEGORY_LABELS[cat] ?? cat
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

export default function MenuPage() {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const { show: showToast, ToastNode } = useToast()
  const [menuItems, setMenuItems] = useState<MenuItem[]>([])
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null)
  const [cart, setCart] = useState<CartItem[]>(() => {
    const saved = sessionStorage.getItem('cart')
    return saved ? JSON.parse(saved) : []
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [cutoffPassed, setCutoffPassed] = useState(false)
  const [activeCategory, setActiveCategory] = useState<string>('')
  const categoryRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const orderDate = sessionStorage.getItem('selectedDate') || new Date().toISOString().split('T')[0]

  // Group items by category preserving insertion order
  const grouped = useMemo(() => {
    const map = new Map<string, MenuItem[]>()
    for (const item of menuItems) {
      const cat = item.category || 'main'
      if (!map.has(cat)) map.set(cat, [])
      map.get(cat)!.push(item)
    }
    return map
  }, [menuItems])

  const categories = useMemo(() => Array.from(grouped.keys()), [grouped])

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurantDetails()
      fetchMenuItems()
    }
  }, [restaurantId])

  useEffect(() => {
    if (cart.length > 0) {
      sessionStorage.setItem('cart', JSON.stringify(cart))
      window.dispatchEvent(new Event('cart-updated'))
    }
  }, [cart])

  useEffect(() => {
    if (restaurant) {
      setCutoffPassed(isCutoffPassed(restaurant.order_cutoff_time, orderDate))
    }
  }, [restaurant, orderDate])

  useEffect(() => {
    if (categories.length > 0 && !activeCategory) {
      setActiveCategory(categories[0])
    }
  }, [categories, activeCategory])

  const fetchRestaurantDetails = async () => {
    try {
      const data = await api.get<Restaurant>(`/api/restaurants/${restaurantId}`)
      setRestaurant(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    }
  }

  const fetchMenuItems = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<MenuItem[]>(`/api/menu?restaurant_id=${restaurantId}`)
      setMenuItems(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const getItemQuantity = (itemId: number): number => {
    return cart.find((i) => i.id === itemId)?.quantity ?? 0
  }

  const addToCart = (item: MenuItem) => {
    if (cutoffPassed) {
      showToast('訂單截止時間已過', 'warning')
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i))
      return [...prev, { ...item, quantity: 1, specialRequests: '' }]
    })
  }

  const updateQuantity = (item: MenuItem, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.id !== item.id))
      return
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.id === item.id)
      if (existing) return prev.map((i) => (i.id === item.id ? { ...i, quantity } : i))
      return [...prev, { ...item, quantity, specialRequests: '' }]
    })
  }

  const getCartTotal = () => cart.reduce((t, item) => t + item.price * item.quantity, 0)
  const getCartItemCount = () => cart.reduce((c, item) => c + item.quantity, 0)

  const goToCart = () => {
    sessionStorage.setItem('cart', JSON.stringify(cart))
    sessionStorage.setItem('restaurant', JSON.stringify(restaurant))
    window.dispatchEvent(new Event('cart-updated'))
    navigate('/cart')
  }

  const scrollToCategory = (cat: string) => {
    setActiveCategory(cat)
    categoryRefs.current[cat]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
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
        <button
          onClick={() => { fetchRestaurantDetails(); fetchMenuItems() }}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-32">
      {ToastNode}

      {/* Restaurant Header */}
      <header className="bg-white shadow-sm sticky top-0 z-40">
        <div className="relative h-36 bg-gray-200 overflow-hidden">
          {restaurant?.image_url ? (
            <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
              <UtensilsCrossed className="w-16 h-16 text-green-200" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
          <button
            onClick={() => navigate('/restaurants')}
            className="absolute top-4 left-4 w-10 h-10 bg-white/90 backdrop-blur-sm rounded-full flex items-center justify-center shadow-md transition hover:bg-white"
          >
            <ArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <div className="absolute bottom-4 left-4 text-white">
            <h1 className="text-xl font-bold drop-shadow-sm">{restaurant?.name}</h1>
            <p className="text-sm opacity-90">{restaurant?.department_store} {restaurant?.floor}</p>
          </div>
        </div>

        {/* Date & Cutoff Info Bar */}
        <div className="px-4 py-2.5 flex items-center justify-between bg-white border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">{formatDate(orderDate)}</span>
          </div>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${cutoffPassed ? 'bg-red-50 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
            {cutoffPassed ? '截止時間已過' : `截止 ${restaurant?.order_cutoff_time}`}
          </span>
        </div>

        {/* Category sticky tabs */}
        {categories.length > 1 && (
          <div className="flex gap-0 overflow-x-auto scrollbar-hide border-b border-gray-100 bg-white">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => scrollToCategory(cat)}
                className={`flex-shrink-0 px-4 py-2.5 text-sm font-medium transition-colors border-b-2 ${
                  activeCategory === cat
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {getCategoryLabel(cat)}
                <span className="ml-1 text-xs text-gray-400">({grouped.get(cat)?.length ?? 0})</span>
              </button>
            ))}
          </div>
        )}
      </header>

      {/* Cutoff Warning */}
      {cutoffPassed && (
        <div className="mx-4 mt-3 bg-red-50 border border-red-200 rounded-xl p-3 flex items-center gap-2">
          <Clock className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-red-700 text-sm font-medium">
            {orderDate} 的訂單已截止。截止時間為 {restaurant?.order_cutoff_time}。
          </p>
        </div>
      )}

      {/* Menu Items grouped by category */}
      <div className="px-4 pt-4 space-y-6">
        {categories.map((cat, catIndex) => (
          <BlurFade key={cat} delay={catIndex * 0.08}>
            <div ref={(el) => { categoryRefs.current[cat] = el }}>
              {categories.length > 1 && (
                <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <span className="flex-1 border-t border-gray-100" />
                  {getCategoryLabel(cat)}
                  <span className="flex-1 border-t border-gray-100" />
                </h2>
              )}
              <div className="space-y-3">
                {grouped.get(cat)?.map((item, itemIndex) => {
                  const quantity = getItemQuantity(item.id)
                  return (
                    <BlurFade key={item.id} delay={catIndex * 0.08 + itemIndex * 0.04}>
                      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow">
                        <div className="flex">
                          <div className="w-24 h-24 flex-shrink-0 bg-gray-50 flex items-center justify-center overflow-hidden">
                            {item.image_url ? (
                              <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                            ) : (
                              <Salad className="w-10 h-10 text-gray-200" />
                            )}
                          </div>
                          <div className="flex-1 p-3 flex flex-col justify-between">
                            <div>
                              <h3 className="font-bold text-gray-800 text-sm leading-tight">{item.name}</h3>
                              {item.description && (
                                <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{item.description}</p>
                              )}
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-base font-bold text-green-600">{formatPrice(item.price)}</p>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item, quantity - 1)}
                                  disabled={quantity <= 0}
                                  className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 disabled:opacity-30 disabled:cursor-not-allowed active:bg-gray-200 transition"
                                >
                                  <Minus className="w-4 h-4" />
                                </button>
                                <span className="font-bold w-6 text-center text-sm tabular-nums">{quantity}</span>
                                <button
                                  onClick={() => (quantity === 0 ? addToCart(item) : updateQuantity(item, quantity + 1))}
                                  disabled={cutoffPassed}
                                  className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center font-bold active:bg-green-600 disabled:opacity-40 disabled:cursor-not-allowed transition"
                                >
                                  <Plus className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </BlurFade>
                  )
                })}
              </div>
            </div>
          </BlurFade>
        ))}
      </div>

      {/* Cart Bottom Bar */}
      {cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white/90 backdrop-blur-md border-t border-gray-200/60 z-[60] px-4 py-3 safe-area-pb shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
          <div className="flex justify-between items-center mb-2.5">
            <div className="flex items-center gap-2">
              <span className="bg-green-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">{getCartItemCount()}</span>
              <span className="font-medium text-gray-700 text-sm">份餐點</span>
              <span className="text-gray-300">·</span>
              <span className="text-xs text-gray-400">{formatDate(orderDate)}</span>
            </div>
            <div className="flex items-center gap-1 font-bold text-lg text-green-600">
              $<NumberTicker value={getCartTotal()} className="text-green-600" />
            </div>
          </div>
          <ShimmerButton
            onClick={goToCart}
            className="w-full py-3.5 font-bold text-base"
            background="rgb(22 163 74)"
            borderRadius="14px"
          >
            查看購物車
          </ShimmerButton>
        </div>
      )}
    </div>
  )
}
