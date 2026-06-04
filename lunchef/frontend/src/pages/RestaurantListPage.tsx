import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'

interface Restaurant {
  id: number
  name: string
  department_store: string
  floor: string
  order_cutoff_time: string
  min_order_type: string
  min_order_value: number
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
          Retry
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/locations')} className="text-gray-600 mb-2">
          ← Back
        </button>
        <h1 className="text-xl font-bold text-gray-800">Available Restaurants</h1>
      </header>

      <div className="p-4 space-y-3">
        {restaurants.length === 0 ? (
          <p className="text-center text-gray-600">No restaurants available for this location.</p>
        ) : (
          restaurants.map(restaurant => (
            <button
              key={restaurant.id}
              onClick={() => navigate(`/menu/${restaurant.id}`)}
              className="w-full bg-white hover:bg-gray-50 text-left p-4 rounded-lg shadow-sm border border-gray-200 transition"
            >
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-bold text-gray-800">{restaurant.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {restaurant.department_store} {restaurant.floor}
                  </p>
                </div>
              </div>
              <div className="mt-2 flex gap-2">
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  Order by {restaurant.order_cutoff_time}
                </span>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                  Min: {restaurant.min_order_value} {restaurant.min_order_type}
                </span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
