import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'

interface Location {
  id: number
  name: string
  address: string
}

interface Restaurant {
  id: number
  name: string
  department_store: string
  floor: string
  order_cutoff_time: string
  min_order_type: string
  min_order_value: number
}

function getDateOptions() {
  const options = []
  const today = new Date()
  for (let i = 0; i < 7; i++) {
    const d = new Date(today)
    d.setDate(today.getDate() + i)
    const dateStr = d.toISOString().split('T')[0]
    const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
    options.push({ value: dateStr, label })
  }
  return options
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, login } = useLiff()

  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getDateOptions()[0].value)
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [, setLoadingLocations] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(false)
  const [error, setError] = useState('')

  const dateOptions = getDateOptions()

  // Load locations on mount
  useEffect(() => {
    fetchLocations()
  }, [])

  // Try restore selected location from sessionStorage
  useEffect(() => {
    const savedLocId = sessionStorage.getItem('selectedLocationId')
    if (savedLocId && locations.length > 0) {
      const loc = locations.find((l) => l.id === parseInt(savedLocId))
      if (loc) {
        setSelectedLocation(loc)
      }
    }
  }, [locations])

  // Fetch restaurants when location changes
  useEffect(() => {
    if (selectedLocation) {
      fetchRestaurants(selectedLocation.id)
    }
  }, [selectedLocation])

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true)
      setError('')
      const data = await api.get<Location[]>('/api/locations')
      setLocations(data)
    } catch (err: any) {
      console.error('Error fetching locations:', err)
      setError(err.message || 'Failed to load locations')
    } finally {
      setLoadingLocations(false)
    }
  }

  const fetchRestaurants = async (locationId: number) => {
    try {
      setLoadingRestaurants(true)
      setError('')
      const data = await api.get<Restaurant[]>(`/api/restaurants?location_id=${locationId}`)
      setRestaurants(data)
    } catch (err: any) {
      console.error('Error fetching restaurants:', err)
      setError(err.message || 'Failed to load restaurants')
    } finally {
      setLoadingRestaurants(false)
    }
  }

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
    sessionStorage.setItem('selectedLocationId', String(location.id))
    setShowLocationPicker(false)
  }

  const handleRestaurantClick = (restaurantId: number) => {
    sessionStorage.setItem('selectedDate', selectedDate)
    navigate(`/menu/${restaurantId}`)
  }

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">Lunchef</h1>
          <p className="text-gray-600">B2B Lunch Ordering</p>
        </div>
        <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6">
          <p className="text-center text-gray-600 mb-6">Please login with LINE to continue</p>
          <button
            onClick={login}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition"
          >
            Login with LINE
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-3 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-lg font-bold text-gray-800">Lunchef</h1>
            <p className="text-xs text-gray-500">{user?.company_name}</p>
          </div>
          <div className="text-right">
            <p className="text-sm font-medium text-gray-700">{user?.name}</p>
          </div>
        </div>
      </header>

      {/* Location Bar */}
      <div className="px-4 py-3">
        <button
          onClick={() => setShowLocationPicker(true)}
          className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition"
        >
          <span className="text-xl">📍</span>
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Deliver to</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {selectedLocation ? selectedLocation.name : 'Select your office location'}
            </p>
          </div>
          <span className="text-gray-400 text-sm">▼</span>
        </button>
      </div>

      {/* Date Selector */}
      {selectedLocation && (
        <div className="px-4 pb-3">
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            {dateOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedDate(opt.value)}
                className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition ${
                  selectedDate === opt.value
                    ? 'bg-green-500 text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 pb-3">
          <div className="bg-red-100 border border-red-300 rounded-lg p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        </div>
      )}

      {/* Restaurant List */}
      <div className="px-4 space-y-3">
        {!selectedLocation ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-4xl mb-3">🏢</p>
            <p className="text-gray-600 mb-4">Select your office location to see available restaurants</p>
            <button
              onClick={() => setShowLocationPicker(true)}
              className="bg-green-500 hover:bg-green-600 text-white font-bold py-2 px-6 rounded-lg transition"
            >
              Select Location
            </button>
          </div>
        ) : loadingRestaurants ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          </div>
        ) : restaurants.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
            <p className="text-gray-600">No restaurants available for this location.</p>
          </div>
        ) : (
          restaurants.map((restaurant) => (
            <button
              key={restaurant.id}
              onClick={() => handleRestaurantClick(restaurant.id)}
              className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-4 text-left hover:shadow-md hover:border-green-200 transition"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-800 text-base">{restaurant.name}</h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {restaurant.department_store} · {restaurant.floor}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex gap-2 flex-wrap">
                <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium">
                  Order by {restaurant.order_cutoff_time}
                </span>
                <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium">
                  Min {restaurant.min_order_value} {restaurant.min_order_type}
                </span>
              </div>
            </button>
          ))
        )}
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Select Location</h2>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-gray-400 hover:text-gray-600 text-xl"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto p-4 space-y-2">
              {locations.map((loc) => (
                <button
                  key={loc.id}
                  onClick={() => handleSelectLocation(loc)}
                  className={`w-full text-left p-4 rounded-xl border transition ${
                    selectedLocation?.id === loc.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-bold text-gray-800">{loc.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{loc.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
