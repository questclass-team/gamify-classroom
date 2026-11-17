import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  fetchCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  refreshSession,
} from '../api/auth'
import { setUnauthorizedHandler } from '../api/client'
import type { LoginRequest } from '../api/types'
import { AuthContext, type AuthState } from './authContext'
import { clearToken, getTokenExpiry, readToken, saveToken } from './session'

/** The access token is renewed this long before it expires, so requests never meet an expired one. */
const REFRESH_AHEAD_MS = 30_000

export function AuthProvider({ children }: { children: ReactNode }) {
  // Always start by checking the session: this tab may have no token yet while the refresh cookie
  // (shared by all tabs) still holds a valid session.
  const [state, setState] = useState<AuthState>({ status: 'loading' })

  /** Forgets the session locally (it has already ended on the server). */
  const endSession = useCallback(() => {
    clearToken()
    setState({ status: 'anonymous' })
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(endSession)
    return () => setUnauthorizedHandler(null)
  }, [endSession])

  // On start: verify a stored token with /me (refreshed automatically on 401), or restore the session
  // from the refresh cookie when this tab has no token.
  useEffect(() => {
    if (state.status !== 'loading') return
    const controller = new AbortController()

    const restore =
      readToken() !== null
        ? fetchCurrentUser(controller.signal)
        : refreshSession().then((session) => session?.user ?? null)

    restore
      .then((user) => {
        if (controller.signal.aborted) return
        setState(user === null ? { status: 'anonymous' } : { status: 'authenticated', user })
      })
      .catch(() => {
        if (!controller.signal.aborted) endSession()
      })
    return () => controller.abort()
  }, [state.status, endSession])

  // Renew the access token shortly before it expires. The session ends only when renewing fails:
  // after 8 hours, after logout elsewhere, or when the server detected a stolen cookie.
  useEffect(() => {
    if (state.status !== 'authenticated') return
    const token = readToken()
    const expiry = token === null ? null : getTokenExpiry(token)
    const delay = expiry === null ? 0 : Math.max(0, expiry - Date.now() - REFRESH_AHEAD_MS)

    let cancelled = false
    const timer = window.setTimeout(() => {
      void refreshSession().then((session) => {
        if (cancelled) return
        if (session === null) endSession()
        else setState({ status: 'authenticated', user: session.user })
      })
    }, delay)

    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [state, endSession])

  const login = useCallback(async (credentials: LoginRequest) => {
    const response = await loginRequest(credentials)
    saveToken(response.accessToken)
    setState({ status: 'authenticated', user: response.user })
    return response.user
  }, [])

  /** Ends the session on the server too, so the refresh cookie cannot be used again. */
  const logout = useCallback(async () => {
    try {
      await logoutRequest()
    } catch {
      // Offline or server error: the local session is still ended below.
    }
    endSession()
  }, [endSession])

  const value = useMemo(() => ({ state, login, logout }), [state, login, logout])

  return <AuthContext value={value}>{children}</AuthContext>
}
