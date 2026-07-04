import React, { createContext, useContext, useState, useEffect } from 'react'
import { authAPI } from '../api/client'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('ta_token')
    const stored = localStorage.getItem('ta_user')
    if (token && stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem('ta_token')
        localStorage.removeItem('ta_user')
      }
    }
    setLoading(false)
  }, [])

  const login = async (email, password) => {
    const data = await authAPI.login(email, password)
    localStorage.setItem('ta_token', data.access_token)
    localStorage.setItem('ta_user', JSON.stringify(data.user))
    setUser(data.user)
    return data.user
  }

  const register = async (payload) => {
    return await authAPI.register(payload)
  }

  const logout = () => {
    localStorage.removeItem('ta_token')
    localStorage.removeItem('ta_user')
    setUser(null)
  }

  const hasPermission = (perm) => {
    return user?.permissions?.includes(perm) ?? false
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, hasPermission }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
