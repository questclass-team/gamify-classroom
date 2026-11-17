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
