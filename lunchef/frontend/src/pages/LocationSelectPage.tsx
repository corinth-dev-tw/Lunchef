import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { api } from '../utils/api'
import { ArrowLeft } from 'lucide-react'

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

  useEffect(() => {
    fetchLocations()
  }, [])

  const fetchLocations = async () => {
    try {
      setLoading(true)
      setError('')
      const data = await api.get<Location[]>('/api/locations')
      setLocations(data)
    } catch (err: any) {
      console.error('Error fetching locations:', err)
      setError(err.message || 'Failed to load locations')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-col justify-center items-center min-h-screen p-4">
        <p className="text-red-600 mb-4">{error}</p>
        <button
          onClick={fetchLocations}
          className="bg-green-500 text-white font-bold py-2 px-4 rounded-lg"
        >
          重試
        </button>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4">
        <button onClick={() => navigate('/')} className="text-gray-600 mb-2 flex items-center gap-1">
          <ArrowLeft className="w-4 h-4" /> 返回
        </button>
        <h1 className="text-xl font-bold text-gray-800">選擇辦公室地點</h1>
      </header>

      <div className="p-4 space-y-3">
        {locations.map(location => (
          <button
            key={location.id}
            onClick={() => selectLocation(location.id)}
            className="w-full bg-white hover:bg-gray-50 text-left p-4 rounded-lg shadow-sm border border-gray-200 transition"
          >
            <h3 className="font-bold text-gray-800">{location.name}</h3>
            <p className="text-sm text-gray-600 mt-1">{location.address}</p>
          </button>
        ))}
      </div>
    </div>
  )
}
