import React, { createContext, useContext, useState } from 'react'
import { adminApi } from '../utils/adminApi'

interface AdminAuthContextType {
  isAdmin: boolean
  login: () => void
  logout: () => Promise<void>
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined)

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [isAdmin, setIsAdmin] = useState(false)

  const login = () => {
    setIsAdmin(true)
  }

  const logout = async () => {
    try {
      await adminApi.post('/api/admin/logout', {})
    } catch {
      // Best-effort: still clear local state even if logout call fails
    }
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
    throw new Error('useAdminAuth must be used within a AdminAuthProvider')
  }
  return context
}
