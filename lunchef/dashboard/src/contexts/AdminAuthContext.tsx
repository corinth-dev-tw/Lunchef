import React, { createContext, useContext, useState } from 'react'

interface AdminAuthContextType {
  isAdmin: boolean
  login: () => void
  logout: () => void
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(() => {
    // Check if we have an admin session by attempting a lightweight API call
    // The actual auth is validated server-side via HttpOnly cookie
    return false
  })

  const login = () => {
    setIsAdmin(true)
  }

  const logout = () => {
    setIsAdmin(false)
  }

  return (
    <AdminAuthContext.Provider value={{ isAdmin, login, logout }}>
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
