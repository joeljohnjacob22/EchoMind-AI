/**
 * EchoMind Frontend — AuthContext
 *
 * Provides global authentication state and actions (login, logout, register).
 * Wraps the existing ThemeProvider and is placed at the app root.
 *
 * Usage:
 *   const { user, token, login, logout, loading } = useAuth()
 */
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { auth, tokenStore } from '../api'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // On mount: restore session from stored JWT
  useEffect(() => {
    const token = tokenStore.get()
    if (!token) {
      setLoading(false)
      return
    }

    auth.me()
      .then(({ user }) => setUser(user))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  const login = useCallback(async (email, password) => {
    setError(null)
    const data = await auth.login({ email, password })
    setUser(data.user)
    return data
  }, [])

  const register = useCallback(async (fields) => {
    setError(null)
    const data = await auth.register(fields)
    setUser(data.user)
    return data
  }, [])

  const logout = useCallback(async () => {
    await auth.logout()
    setUser(null)
  }, [])

  const quickAccess = useCallback(async () => {
    setError(null)
    const data = await auth.quickAccess()
    setUser(data.user)
    return data
  }, [])

  const refreshUser = useCallback(async () => {
    const { user } = await auth.me()
    setUser(user)
    return user
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, register, logout, quickAccess, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>')
  return ctx
}

export default AuthContext
