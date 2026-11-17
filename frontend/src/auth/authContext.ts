import { createContext, useContext } from 'react'
import type { CurrentUser, LoginRequest } from '../api/types'

export type AuthState =
  { status: 'loading' } | { status: 'anonymous' } | { status: 'authenticated'; user: CurrentUser }

export interface AuthContextValue {
  state: AuthState
  /** Throws ApiError on rejected credentials. */
  login: (credentials: LoginRequest) => Promise<CurrentUser>
  /** Ends the session on the server and locally. */
  logout: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext)
  if (value === null) throw new Error('useAuth must be used inside <AuthProvider>')
  return value
}
