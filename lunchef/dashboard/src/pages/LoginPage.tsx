import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { api } from '../utils/api'

interface Restaurant {
  id: number
  name: string
}

export default function LoginPage() {
  const navigate = useNavigate()
  const { isLoggedIn, login } = useAuth()
  const [restaurants, setRestaurants] = useState<Restaurant[]>([])
  const [selectedRestaurant, setSelectedRestaurant] = useState('')
  const [apiKey, setApiKey] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isLoggedIn) {
      navigate('/orders')
      return
    }
    fetchRestaurants()
  }, [isLoggedIn])

  const fetchRestaurants = async () => {
    try {
      // Public endpoint to list available restaurants for login
      const data = await api.get<Restaurant[]>('/api/restaurants')
      setRestaurants(data)
    } catch (err: any) {
      console.error('Error fetching restaurants:', err)
      setError('Failed to load restaurants')
    }
  }

  const handleLogin = async () => {
    const restaurantId = parseInt(selectedRestaurant)
    if (!restaurantId || isNaN(restaurantId)) {
      setError('Please select a restaurant')
      return
    }

    if (!apiKey.trim()) {
      setError('Please enter your API key')
      return
    }

    setLoading(true)
    setError('')

    try {
      const data = await api.post<{
        success: boolean
        token: string
        restaurant: { id: number; name: string }
      }>('/api/dashboard/login', {
        restaurant_id: restaurantId,
        api_key: apiKey.trim(),
      })

      login(data.restaurant.id, data.token, data.restaurant.name)
      navigate('/orders')
    } catch (err: any) {
      setError(err.message || 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-800">Lunchef Dashboard</h1>
          <p className="text-gray-600 mt-2">Restaurant Management</p>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Restaurant
            </label>
            <select
              value={selectedRestaurant}
              onChange={(e) => setSelectedRestaurant(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            >
              <option value="">Select a restaurant...</option>
              {restaurants.map(r => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your API key"
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
            />
          </div>

          {error && (
            <p className="text-red-600 text-sm">{error}</p>
          )}

          <button
            onClick={handleLogin}
            disabled={loading}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50"
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  )
}
