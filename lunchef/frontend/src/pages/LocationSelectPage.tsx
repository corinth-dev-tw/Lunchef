import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft, MapPin } from 'lucide-react'
import { BlurFade } from '../components/magicui/blur-fade'
import { RippleButton } from '../components/magicui/ripple-button'

interface Location {
  id: number
  name: string
  address: string
}

export default function LocationSelectPage() {
  const navigate = useNavigate()
  const [locations, setLocations] = useState<Location[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => { fetchLocations() }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Location[]>('/api/locations')
      setLocations(data)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '載入失敗'
      setError(msg)
    } finally {
      setLoading(false)
    }
  }

  const selectLocation = (locationId: number) => {
    sessionStorage.setItem('selectedLocationId', String(locationId))
    navigate('/restaurants')
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
        <RippleButton
          onClick={fetchLocations}
          className="border-green-500 bg-green-500 text-white font-bold"
          rippleColor="#ffffff"
        >
          重試
        </RippleButton>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white/90 backdrop-blur-sm shadow-sm p-4 sticky top-0 z-40">
        <button onClick={() => navigate('/')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">選擇辦公室地點</h1>
      </header>

      <div className="p-4 space-y-3">
        {locations.map((location, index) => (
          <BlurFade key={location.id} delay={index * 0.06}>
            <button
              onClick={() => selectLocation(location.id)}
              className="w-full bg-white hover:bg-green-50 text-left p-4 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center flex-shrink-0">
                  <MapPin className="w-4 h-4 text-green-500" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">{location.name}</h3>
                  <p className="text-sm text-gray-400 mt-0.5">{location.address}</p>
                </div>
              </div>
            </button>
          </BlurFade>
        ))}
      </div>
    </div>
  )
}
