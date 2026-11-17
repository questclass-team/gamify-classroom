import { apiRequest } from './client'
import type { CurrentUser, LoginRequest, LoginResponse } from './types'

export function login(credentials: LoginRequest): Promise<LoginResponse> {
  return apiRequest<LoginResponse>('/api/core/auth/login', {
    method: 'POST',
    json: credentials,
    auth: false,
  })
}

export function fetchCurrentUser(signal?: AbortSignal): Promise<CurrentUser> {
  return apiRequest<CurrentUser>('/api/core/auth/me', { signal })
}

/** Ends the session on the server (revokes the refresh cookie). Needs no access token. */
export function logout(): Promise<void> {
  return apiRequest<void>('/api/core/auth/logout', { method: 'POST', auth: false })
}

export { refreshSession } from './client'
