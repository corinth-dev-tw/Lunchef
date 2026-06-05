import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'
import { MapPin, X, Building2, SearchX, Clock, Package } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import { SkeletonCard } from '../components/Skeleton'

interface Location {
  id: number
  name: string
  address: string
}

interface Restaurant {
  id: number
  name: string
  cuisine_type: string
  department_store: string
  floor: string
  image_url: string | null
  order_cutoff_time: string
  min_order_type: string
  min_order_value: number
}

const CUISINE_MAP: Record<string, { label: string; color: string }> = {
  all: { label: 'All', color: 'bg-gray-100 text-gray-800' },
  thai: { label: 'Thai', color: 'bg-orange-100 text-orange-800' },
  japanese: { label: 'Japanese', color: 'bg-red-100 text-red-800' },
  korean: { label: 'Korean', color: 'bg-rose-100 text-rose-800' },
  chinese: { label: 'Chinese', color: 'bg-yellow-100 text-yellow-800' },
  italian: { label: 'Italian', color: 'bg-green-100 text-green-800' },
  american: { label: 'American', color: 'bg-blue-100 text-blue-800' },
  vietnamese: { label: 'Vietnamese', color: 'bg-emerald-100 text-emerald-800' },
  indian: { label: 'Indian', color: 'bg-amber-100 text-amber-800' },
  asian: { label: 'Asian', color: 'bg-purple-100 text-purple-800' },
}

function getCuisineInfo(type: string) {
  return CUISINE_MAP[type] || CUISINE_MAP.asian
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

function getCuisineGradient(type: string): string {
  const map: Record<string, string> = {
    thai: 'from-orange-400 to-red-400',
    japanese: 'from-red-400 to-pink-400',
    korean: 'from-rose-400 to-orange-400',
    chinese: 'from-yellow-400 to-orange-400',
    italian: 'from-green-400 to-emerald-400',
    american: 'from-blue-400 to-indigo-400',
    vietnamese: 'from-emerald-400 to-green-400',
    indian: 'from-amber-400 to-orange-400',
    asian: 'from-purple-400 to-pink-400',
  }
  return map[type] || 'from-gray-400 to-gray-500'
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, login } = useLiff()

  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(getDateOptions()[0].value)
  const [selectedCuisine, setSelectedCuisine] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
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
      if (loc) setSelectedLocation(loc)
    }
  }, [locations])

  // Fetch restaurants when location or cuisine changes
  useEffect(() => {
    if (selectedLocation) {
      fetchRestaurants()
    }
  }, [selectedLocation, selectedCuisine])

  // Debounced search
  useEffect(() => {
    if (!selectedLocation) return
    const timer = setTimeout(() => {
      fetchRestaurants()
    }, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

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

  const fetchRestaurants = async () => {
    if (!selectedLocation) return
    try {
      setLoadingRestaurants(true)
      setError('')
      let url = `/api/restaurants?location_id=${selectedLocation.id}`
      if (selectedCuisine !== 'all') url += `&cuisine=${selectedCuisine}`
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`
      const data = await api.get<Restaurant[]>(url)
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

  const availableCuisines = ['all', ...Array.from(new Set(restaurants.map(r => r.cuisine_type || 'asian')))]

  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gray-50">
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

      <div className="px-4 pt-4 space-y-4">
        {/* Location Bar */}
        <button
          onClick={() => setShowLocationPicker(true)}
          className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition"
        >
          <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-500 font-medium">Deliver to</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {selectedLocation ? selectedLocation.name : 'Select your office location'}
            </p>
          </div>
          <span className="text-gray-400 text-sm">▼</span>
        </button>

        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Date Selector */}
        {selectedLocation && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
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
        )}

        {/* Cuisine Filters */}
        {selectedLocation && restaurants.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
            {availableCuisines.map((type) => {
              const info = getCuisineInfo(type)
              const isActive = selectedCuisine === type
              return (
                <button
                  key={type}
                  onClick={() => setSelectedCuisine(type)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-full text-sm font-medium transition border ${
                    isActive
                      ? 'bg-green-500 text-white border-green-500 shadow-sm'
                      : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <span className={`w-2 h-2 rounded-full ${isActive ? 'bg-white' : 'bg-current opacity-50'}`} />
                  <span>{info.label}</span>
                </button>
              )
            })}
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-100 border border-red-300 rounded-xl p-3">
            <p className="text-red-800 text-sm">{error}</p>
          </div>
        )}

        {/* Restaurant List */}
        <div className="space-y-3">
          {!selectedLocation ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-600 font-medium mb-2">Select your office location</p>
              <p className="text-gray-400 text-sm mb-6">We'll show restaurants that deliver to your building</p>
              <button
                onClick={() => setShowLocationPicker(true)}
                className="bg-green-500 hover:bg-green-600 text-white font-bold py-2.5 px-6 rounded-xl transition"
              >
                Choose Location
              </button>
            </div>
          ) : loadingRestaurants ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : restaurants.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8 text-center">
              <SearchX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-600 font-medium mb-1">
                {searchQuery ? 'No restaurants match your search' : 'No restaurants available'}
              </p>
              <p className="text-gray-400 text-sm">
                {searchQuery ? 'Try a different search term' : 'Check back later or try another location'}
              </p>
            </div>
          ) : (
            restaurants.map((restaurant) => {
              const cuisine = getCuisineInfo(restaurant.cuisine_type || 'asian')
              return (
                <button
                  key={restaurant.id}
                  onClick={() => handleRestaurantClick(restaurant.id)}
                  className="w-full bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden text-left hover:shadow-md hover:border-green-200 transition active:scale-[0.99]"
                >
                  {/* Image */}
                  {restaurant.image_url ? (
                    <div className="h-36 w-full relative">
                      <img
                        src={restaurant.image_url}
                        alt={restaurant.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none'
                        }}
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                      <div className="absolute bottom-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold ${cuisine.color}`}>
                          <span>{cuisine.label}</span>
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div className={`h-36 w-full bg-gradient-to-br ${getCuisineGradient(restaurant.cuisine_type || 'asian')} relative`}>
                      <div className="absolute bottom-3 left-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur`}>
                          <span>{cuisine.label}</span>
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Info */}
                  <div className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-bold text-gray-800 text-base">{restaurant.name}</h3>
                        <p className="text-sm text-gray-500 mt-0.5">
                          {restaurant.department_store} · {restaurant.floor}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 flex gap-2 flex-wrap">
                      <span className="text-xs bg-blue-50 text-blue-700 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Order by {restaurant.order_cutoff_time}
                      </span>
                      <span className="text-xs bg-orange-50 text-orange-700 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                        <Package className="w-3 h-3" />
                        Min {restaurant.min_order_value} {restaurant.min_order_type}
                      </span>
                    </div>
                  </div>
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-2xl sm:rounded-2xl max-h-[70vh] flex flex-col animate-slide-up">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold">Select Location</h2>
              <button
                onClick={() => setShowLocationPicker(false)}
                className="text-gray-400 hover:text-gray-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition"
              >
                <X className="w-5 h-5" />
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
