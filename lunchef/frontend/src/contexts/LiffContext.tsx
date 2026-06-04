import React, { createContext, useContext, useState, useEffect } from 'react'
import liff from '@line/liff'
import { api } from '../utils/api'

interface User {
  id: number
  line_user_id: string
  company_id: number
  name: string
  company_name: string
  tax_id: string
  role: string
}

interface LiffContextType {
  isInitialized: boolean
  isLoggedIn: boolean
  user: User | null
  accessToken: string | null
  error: string | null
  login: () => void
  logout: () => void
}

const LiffContext = createContext<LiffContextType | undefined>(undefined)

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8787'
const LIFF_ID = import.meta.env.VITE_LIFF_ID || 'your-liff-id'

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [isInitialized, setIsInitialized] = useState(false)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    initializeLiff()
  }, [])

  const initializeLiff = async () => {
    try {
      await liff.init({ liffId: LIFF_ID })
      setIsInitialized(true)

      if (liff.isLoggedIn()) {
        const token = liff.getAccessToken()
        if (token) {
          setAccessToken(token)
          const profile = await liff.getProfile()
          await loginUser(token, profile.displayName)
        }
      }
    } catch (err) {
      console.error('LIFF init error:', err)
      setError('Failed to initialize LINE')
    }
  }

  useEffect(() => {
    api.setToken(accessToken)
  }, [accessToken])

  const loginUser = async (token: string, displayName: string) => {
    try {
      const response = await fetch(`${API_BASE}/api/users/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ name: displayName })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))
        if (response.status === 403 && errData.error?.includes('not registered')) {
          setError('Your LINE account is not registered with Lunchef. Please contact your company admin to set up access.')
          return
        }
        throw new Error(errData.error || 'Login failed')
      }

      const userData = await response.json()
      setUser(userData)
      setIsLoggedIn(true)
    } catch (err: any) {
      console.error('Login error:', err)
      setError(err.message || 'Failed to login')
    }
  }

  const login = () => {
    if (!liff.isLoggedIn()) {
      liff.login()
    }
  }

  const logout = () => {
    liff.logout()
    setUser(null)
    setAccessToken(null)
    setIsLoggedIn(false)
  }

  return (
    <LiffContext.Provider value={{ isInitialized, isLoggedIn, user, accessToken, error, login, logout }}>
      {children}
    </LiffContext.Provider>
  )
}

export function useLiff() {
  const context = useContext(LiffContext)
  if (context === undefined) {
    throw new Error('useLiff must be used within a LiffProvider')
  }
  return context
}
