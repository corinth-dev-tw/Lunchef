import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useLiff } from '../contexts/LiffContext'
import { api } from '../utils/api'
import { MapPin, X, Building2, SearchX, Clock, Package, Calendar, UtensilsCrossed } from 'lucide-react'
import SearchBar from '../components/SearchBar'
import { SkeletonCard } from '../components/Skeleton'
import { BlurFade } from '../components/magicui/blur-fade'
import { ShimmerButton } from '../components/magicui/shimmer-button'
import { ProgressiveBlur } from '../components/magicui/progressive-blur'
import { formatDate, getCutoffCountdown, getGreeting } from '../lib/dateUtils'

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
  all:        { label: '全部',     color: 'bg-gray-100 text-gray-800' },
  thai:       { label: '泰式',     color: 'bg-orange-100 text-orange-800' },
  japanese:   { label: '日式',     color: 'bg-red-100 text-red-800' },
  korean:     { label: '韓式',     color: 'bg-rose-100 text-rose-800' },
  chinese:    { label: '中式',     color: 'bg-yellow-100 text-yellow-800' },
  italian:    { label: '義式',     color: 'bg-green-100 text-green-800' },
  american:   { label: '美式',     color: 'bg-blue-100 text-blue-800' },
  vietnamese: { label: '越南料理', color: 'bg-emerald-100 text-emerald-800' },
  indian:     { label: '印度料理', color: 'bg-amber-100 text-amber-800' },
  asian:      { label: '亞洲料理', color: 'bg-purple-100 text-purple-800' },
}

function getCuisineInfo(type: string) {
  return CUISINE_MAP[type] || CUISINE_MAP.asian
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

function getTodayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getMaxDateStr(days = 7): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return d.toISOString().split('T')[0]
}

export default function HomePage() {
  const navigate = useNavigate()
  const { isLoggedIn, user, login } = useLiff()

  const [locations, setLocations] = useState<Location[]>([])
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null)
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [selectedDate, setSelectedDate] = useState(() => {
    const saved = sessionStorage.getItem('selectedDate')
    const today = getTodayStr()
    return saved && saved >= today ? saved : today
  })
  const [selectedCuisine, setSelectedCuisine] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [, setLoadingLocations] = useState(true)
  const [loadingRestaurants, setLoadingRestaurants] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { fetchLocations() }, [])

  useEffect(() => {
    const savedLocId = sessionStorage.getItem('selectedLocationId')
    if (savedLocId && locations.length > 0) {
      const loc = locations.find((l) => l.id === parseInt(savedLocId))
      if (loc) setSelectedLocation(loc)
    }
  }, [locations])

  useEffect(() => {
    if (selectedLocation) fetchRestaurants()
  }, [selectedLocation, selectedCuisine])

  useEffect(() => {
    if (!selectedLocation) return
    const timer = setTimeout(fetchRestaurants, 300)
    return () => clearTimeout(timer)
  }, [searchQuery])

  const fetchLocations = async () => {
    try {
      setLoadingLocations(true)
      setError('')
      const data = await api.get<Location[]>('/api/locations')
      setLocations(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
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
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    } finally {
      setLoadingRestaurants(false)
    }
  }

  const handleSelectLocation = (location: Location) => {
    setSelectedLocation(location)
    sessionStorage.setItem('selectedLocationId', String(location.id))
    setShowLocationPicker(false)
  }

  const handleDateChange = (dateStr: string) => {
    setSelectedDate(dateStr)
    sessionStorage.setItem('selectedDate', dateStr)
  }

  const handleRestaurantClick = (restaurantId: number) => {
    sessionStorage.setItem('selectedDate', selectedDate)
    navigate(`/menu/${restaurantId}`)
  }

  const availableCuisines = ['all', ...Array.from(new Set(restaurants.map((r) => r.cuisine_type || 'asian')))]

  // ── Not logged in ──
  if (!isLoggedIn) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 bg-gradient-to-b from-green-50 to-white">
        <BlurFade delay={0}>
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-green-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-200">
              <UtensilsCrossed className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-800 mb-1">Lunchef</h1>
            <p className="text-gray-400 text-sm">B2B 午餐訂餐</p>
          </div>
        </BlurFade>
        <BlurFade delay={0.1}>
          <div className="w-full max-w-sm bg-white rounded-2xl shadow-xl shadow-gray-100 p-6">
            <p className="text-center text-gray-500 mb-5 text-sm">請使用 LINE 登入以繼續</p>
            <ShimmerButton
              onClick={login}
              className="w-full py-3.5 font-bold text-base"
              background="rgb(6 199 85)"
              borderRadius="14px"
            >
              使用 LINE 登入
            </ShimmerButton>
          </div>
        </BlurFade>
      </div>
    )
  }

  const greeting = getGreeting()
  const firstName = user?.name?.split(' ')[0] ?? user?.name ?? ''

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <header className="bg-white/90 backdrop-blur-sm shadow-sm px-4 py-3 sticky top-0 z-40">
        <div className="flex justify-between items-center">
          <div>
            <p className="text-xs text-gray-400 font-medium">{greeting}，{firstName}！</p>
            <h1 className="text-lg font-bold text-gray-800">Lunchef</h1>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500">{user?.company_name}</p>
          </div>
        </div>
      </header>

      <div className="px-4 pt-4 space-y-3">
        {/* Location Bar */}
        <button
          onClick={() => setShowLocationPicker(true)}
          className="w-full bg-white rounded-xl shadow-sm border border-gray-200 p-3 flex items-center gap-3 text-left hover:bg-gray-50 transition active:scale-[0.99]"
        >
          <MapPin className="w-5 h-5 text-green-600 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-400 font-medium">送達地點</p>
            <p className="text-sm font-bold text-gray-800 truncate">
              {selectedLocation ? selectedLocation.name : '選擇您的辦公室'}
            </p>
          </div>
          <span className="text-gray-400 text-sm">▼</span>
        </button>

        {/* Search */}
        <SearchBar value={searchQuery} onChange={setSearchQuery} />

        {/* Date Selector */}
        {selectedLocation && (
          <div className="bg-white rounded-xl border border-gray-200 p-3 flex items-center gap-3">
            <Calendar className="w-5 h-5 text-green-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-gray-400 font-medium mb-1">訂餐日期</p>
              <div className="flex items-center gap-3">
                <input
                  type="date"
                  value={selectedDate}
                  min={getTodayStr()}
                  max={getMaxDateStr(7)}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="bg-transparent outline-none text-sm font-bold text-gray-800 border-b border-green-500 pb-0.5"
                />
                <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                  {formatDate(selectedDate)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Cuisine Filters */}
        {selectedLocation && restaurants.length > 0 && (
          <div className="relative">
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide -mx-4 px-4">
              {availableCuisines.map((type) => {
                const info = getCuisineInfo(type)
                const isActive = selectedCuisine === type
                return (
                  <button
                    key={type}
                    onClick={() => setSelectedCuisine(type)}
                    className={`flex-shrink-0 px-3 py-2 rounded-full text-sm font-medium transition border ${
                      isActive
                        ? 'bg-green-500 text-white border-green-500 shadow-sm'
                        : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {info.label}
                  </button>
                )
              })}
            </div>
            <ProgressiveBlur position="right" width="60px" className="top-0 bottom-0 h-full" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Restaurant List */}
        <div className="space-y-3">
          {!selectedLocation ? (
            <BlurFade delay={0}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Building2 className="w-7 h-7 text-green-400" />
                </div>
                <p className="text-gray-600 font-medium mb-1">選擇您的辦公室地點</p>
                <p className="text-gray-400 text-sm mb-5">我們將顯示送達您所在大樓的餐廳</p>
                <ShimmerButton
                  onClick={() => setShowLocationPicker(true)}
                  className="mx-auto px-6 py-2.5 font-bold text-sm"
                  background="rgb(22 163 74)"
                  borderRadius="50px"
                >
                  選擇地點
                </ShimmerButton>
              </div>
            </BlurFade>
          ) : loadingRestaurants ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : restaurants.length === 0 ? (
            <BlurFade delay={0}>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 text-center">
                <SearchX className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600 font-medium mb-1">
                  {searchQuery ? '沒有符合搜尋條件的餐廳' : '此地點暫無可選餐廳'}
                </p>
                <p className="text-gray-400 text-sm">
                  {searchQuery ? '請嘗試其他搜尋詞' : '請稍後再試，或選擇其他地點'}
                </p>
              </div>
            </BlurFade>
          ) : (
            restaurants.map((restaurant, index) => {
              const cuisine = getCuisineInfo(restaurant.cuisine_type || 'asian')
              const countdown = getCutoffCountdown(restaurant.order_cutoff_time)
              return (
                <BlurFade key={restaurant.id} delay={index * 0.06}>
                  <button
                    onClick={() => handleRestaurantClick(restaurant.id)}
                    className="w-full bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden text-left hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 active:scale-[0.99]"
                  >
                    {/* Image */}
                    {restaurant.image_url ? (
                      <div className="h-36 w-full relative overflow-hidden">
                        <img
                          src={restaurant.image_url}
                          alt={restaurant.name}
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }}
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                        <div className="absolute bottom-3 left-3">
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-bold ${cuisine.color}`}>
                            {cuisine.label}
                          </span>
                        </div>
                        {countdown && (
                          <div className="absolute top-3 right-3 bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                            {countdown}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className={`h-36 w-full bg-gradient-to-br ${getCuisineGradient(restaurant.cuisine_type || 'asian')} relative`}>
                        <div className="absolute inset-0 flex items-end p-3 justify-between">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-bold bg-white/90 backdrop-blur text-gray-800">
                            {cuisine.label}
                          </span>
                          {countdown && (
                            <span className="bg-red-500 text-white text-xs font-bold px-2.5 py-1 rounded-full shadow">
                              {countdown}
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Info */}
                    <div className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="font-bold text-gray-800 text-base">{restaurant.name}</h3>
                          <p className="text-sm text-gray-400 mt-0.5">
                            {restaurant.department_store} · {restaurant.floor}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 flex gap-2 flex-wrap">
                        <span className="text-xs bg-blue-50 text-blue-600 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                          <Clock className="w-3 h-3" />截止 {restaurant.order_cutoff_time}
                        </span>
                        <span className="text-xs bg-orange-50 text-orange-600 px-2.5 py-1 rounded-full font-medium inline-flex items-center gap-1">
                          <Package className="w-3 h-3" />最低 {restaurant.min_order_value} {restaurant.min_order_type}
                        </span>
                      </div>
                    </div>
                  </button>
                </BlurFade>
              )
            })
          )}
        </div>
      </div>

      {/* Location Picker Modal */}
      {showLocationPicker && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-end sm:items-center justify-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-3xl max-h-[70vh] flex flex-col animate-slide-up shadow-2xl">
            <div className="p-4 border-b flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">選擇地點</h2>
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
                  className={`w-full text-left p-4 rounded-2xl border-2 transition ${
                    selectedLocation?.id === loc.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-100 hover:bg-gray-50'
                  }`}
                >
                  <h3 className="font-bold text-gray-800">{loc.name}</h3>
                  <p className="text-sm text-gray-400 mt-1">{loc.address}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
