import React, { createContext, useContext, useState } from 'react'

interface AdminAuthContextType {
  isAdmin: boolean
  token: string | null
  login: (token: string) => void
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    return !!localStorage.getItem('admin_token')
  })
  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('admin_token')
  })

  const login = (newToken: string) => {
    localStorage.setItem('admin_token', newToken)
    setToken(newToken)
    setIsAdmin(true)
  }

  const logout = () => {
    localStorage.removeItem('admin_token')
    setToken(null)
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, token, login, logout }}>
      {children}
    </AdminAuthContext.Provider>
  )
}

export function useAdminAuth() {
  const context = useContext(AdminAuthContext)
  if (context === undefined) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider')
  }
  return context
}
