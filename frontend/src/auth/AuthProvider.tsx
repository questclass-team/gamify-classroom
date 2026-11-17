import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { fetchCurrentUser, login as loginRequest } from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { LoginRequest } from '../api/types'
import { AuthContext, type AuthState } from './authContext'
import { clearToken, getTokenExpiry, readToken, saveToken } from './session'

export function AuthProvider({ children }: { children: ReactNode }) {
  // A stored token is verified with /me before the user is trusted.
  const [state, setState] = useState<AuthState>(() =>
    readToken() === null ? { status: 'anonymous' } : { status: 'loading' },
  )

  const logout = useCallback(() => {
    clearToken()
    setState({ status: 'anonymous' })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  useEffect(() => {
    if (state.status !== 'loading') return
    const controller = new AbortController()
    fetchCurrentUser(controller.signal)
      .then((user) => setState({ status: 'authenticated', user }))
      .catch(() => {
        if (!controller.signal.aborted) logout()
      })
    return () => controller.abort()
  }, [state.status, logout])

  // Log out exactly when the JWT expires (immediately if it is already gone or invalid).
  useEffect(() => {
    if (state.status !== 'authenticated') return
    const token = readToken()
    const expiry = token === null ? null : getTokenExpiry(token)
    const timer = window.setTimeout(logout, expiry === null ? 0 : expiry - Date.now())
    return () => window.clearTimeout(timer)
  }, [state, logout])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await loginRequest(credentials)
    saveToken(response.accessToken)
    setState({ status: 'authenticated', user: response.user })
    return response.user
  }, [])

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
