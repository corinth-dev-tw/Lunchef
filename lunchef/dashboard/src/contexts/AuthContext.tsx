import React, { createContext, useContext, useState, useEffect } from 'react'
import { api } from '../utils/api'

interface AuthContextType {
  isLoggedIn: boolean
  restaurantId: number | null
  restaurantName: string | null
  login: (restaurantId: number, token: string, restaurantName: string) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoggedIn, setIsLoggedIn] = useState(() => {
    return !!localStorage.getItem('dashboard_token')
  })
  const [restaurantId, setRestaurantId] = useState<number | null>(() => {
    const id = localStorage.getItem('dashboard_restaurant_id')
    return id ? parseInt(id) : null
  })
  const [restaurantName, setRestaurantName] = useState<string | null>(() => {
    return localStorage.getItem('dashboard_restaurant_name')
  })

  useEffect(() => {
    const token = localStorage.getItem('dashboard_token')
    if (token) {
      api.setToken(token)
    }
  }, [])

  const login = (id: number, token: string, name: string) => {
    localStorage.setItem('dashboard_token', token)
    localStorage.setItem('dashboard_restaurant_id', String(id))
    localStorage.setItem('dashboard_restaurant_name', name)
    api.setToken(token)
    setIsLoggedIn(true)
    setRestaurantId(id)
    setRestaurantName(name)
  }

  const logout = () => {
    localStorage.removeItem('dashboard_token')
    localStorage.removeItem('dashboard_restaurant_id')
    localStorage.removeItem('dashboard_restaurant_name')
    api.setToken(null)
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
