import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

interface AuthContextType {
  isLoggedIn: boolean
  restaurantId: number | null
  restaurantName: string | null
  login: (restaurantId: number, restaurantName: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [restaurantId, setRestaurantId] = useState<number | null>(null)
  const [restaurantName, setRestaurantName] = useState<string | null>(null)

  useEffect(() => {
    // Try to restore session from stored restaurant info (non-sensitive)
    // The actual auth token is in HttpOnly cookie
    const storedId = localStorage.getItem('dashboard_restaurant_id')
    const storedName = localStorage.getItem('dashboard_restaurant_name')
    if (storedId) {
      setRestaurantId(parseInt(storedId))
      setRestaurantName(storedName)
      setIsLoggedIn(true)
    }
  }, [])

  const login = (id: number, name: string) => {
    localStorage.setItem('dashboard_restaurant_id', String(id))
    localStorage.setItem('dashboard_restaurant_name', name)
    setIsLoggedIn(true)
    setRestaurantId(id)
    setRestaurantName(name)
  }

  const logout = () => {
    localStorage.removeItem('dashboard_restaurant_id')
    localStorage.removeItem('dashboard_restaurant_name')
    setIsLoggedIn(false)
    setRestaurantId(null)
    setRestaurantName(null)
  }

  return (
    <AuthContext.Provider value={{ isLoggedIn, restaurantId, restaurantName, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
