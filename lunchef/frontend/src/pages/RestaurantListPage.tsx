import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, UtensilsCrossed } from 'lucide-react'

interface Restaurant {
  id: number
  name: string
  department_store: string
  floor: string
  order_cutoff_time: string
  min_order_type: string
  min_order_value: number
  cuisine_type?: string
  image_url?: string
}

export default function RestaurantListPage() {
  const navigate = useNavigate()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const locationId = sessionStorage.getItem('selectedLocationId')

  useEffect(() => {
    if (!locationId) {
      navigate('/locations')
      return
    }
    fetchRestaurants()
  }, [locationId])

  const fetchRestaurants = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Restaurant[]>(`/api/restaurants?location_id=${locationId}`)
      setRestaurants(data)
    } catch (err: any) {
      console.error('Error fetching restaurants:', err)
      setError(err.message || 'Failed to load restaurants')
    } finally {
      setLoading(false)
    }
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
          onClick={fetchRestaurants}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/locations')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">可選餐廳</h1>
      </header>

      <div className="p-4 space-y-4">
        {restaurants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <UtensilsCrossed className="w-12 h-12 mx-auto mb-3 text-gray-400" />
            <p className="text-gray-600">此地點暫無可選餐廳。</p>
          </div>
        ) : (
          restaurants.map(restaurant => (
            <button
              key={restaurant.id}
              onClick={() => navigate(`/menu/${restaurant.id}`)}
              className="w-full bg-white text-left rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md hover:border-green-200 transition active:scale-[0.99]"
            >
              {/* Image */}
              <div className="h-36 bg-gray-100 relative overflow-hidden">
                {restaurant.image_url ? (
                  <img src={restaurant.image_url} alt={restaurant.name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                    <UtensilsCrossed className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                <div className="absolute top-3 right-3">
                  <span className="text-xs bg-white/90 backdrop-blur-sm text-gray-700 px-2.5 py-1 rounded-full font-medium shadow-sm">
                    截止 {restaurant.order_cutoff_time}
                  </span>
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <h3 className="font-bold text-gray-800 text-base">{restaurant.name}</h3>
                    <p className="text-sm text-gray-500 mt-0.5">
                      {restaurant.cuisine_type || '餐廳'} · {restaurant.department_store} {restaurant.floor}
                    </p>
                  </div>
                  <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium whitespace-nowrap ml-2">
                    最低 {restaurant.min_order_value} {restaurant.min_order_type}
                  </span>
                </div>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
