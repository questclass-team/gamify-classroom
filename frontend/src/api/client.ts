import { readToken, saveToken } from '../auth/session'
import type { ProblemDetails, RefreshResponse } from './types'

export class ApiError extends Error {
  /** HTTP status; 0 when the request never reached the server. */
  readonly status: number
  readonly problem: ProblemDetails | null

  constructor(status: number, problem: ProblemDetails | null, message: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.problem = problem
  }
}

let unauthorizedHandler: (() => void) | null = null

/** Called when an authenticated request gets 401 and the session cannot be refreshed. */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialized as JSON request body. */
  json?: unknown
  /** Multipart body (file uploads); the browser sets Content-Type with the boundary. */
  formData?: FormData
  /** Attach the stored JWT and refresh it on 401 (default true). */
  auth?: boolean
  signal?: AbortSignal
}

/**
 * Sends a request to the API. On 401 an authenticated request refreshes the access token once (with the
 * HttpOnly refresh cookie) and is repeated; only when that fails is the user logged out.
 */
export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true } = options

  let response = await send(path, options, auth ? readToken() : null)

  if (response.status === 401 && auth) {
    const session = await refreshSession()
    if (session !== null) response = await send(path, options, session.accessToken)
  }

  if (!response.ok) {
    const problem = await readProblem(response)
    if (response.status === 401 && auth) unauthorizedHandler?.()
    throw new ApiError(
      response.status,
      problem,
      problem?.detail ?? problem?.title ?? `HTTP ${response.status}`,
    )
  }

  if (response.status === 204) return undefined as T
  return (await response.json()) as T
}

let refreshInFlight: Promise<RefreshResponse | null> | null = null

/**
 * Exchanges the refresh cookie for a new access token and stores it; null when the session is over.
 * Concurrent callers share one request: a second refresh with the same cookie would look like a stolen
 * cookie to the server, which then ends every session of the user.
 */
export function refreshSession(): Promise<RefreshResponse | null> {
  refreshInFlight ??= requestRefresh().finally(() => {
    refreshInFlight = null
  })
  return refreshInFlight
}

async function requestRefresh(): Promise<RefreshResponse | null> {
  try {
    const response = await fetch('/api/core/auth/refresh', {
      method: 'POST',
      headers: { Accept: 'application/json' },
    })
    if (!response.ok) return null

    const session = (await response.json()) as RefreshResponse
    saveToken(session.accessToken)
    return session
  } catch {
    return null
  }
}

async function send(
  path: string,
  options: RequestOptions,
  token: string | null,
): Promise<Response> {
  const { method = 'GET', json, formData, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  if (token !== null) headers.set('Authorization', `Bearer ${token}`)

  try {
    return await fetch(path, {
      method,
      headers,
      body: formData ?? (json === undefined ? undefined : JSON.stringify(json)),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, null, 'Network error')
  }
}

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const body: unknown = await response.json()
    return typeof body === 'object' && body !== null ? (body as ProblemDetails) : null
  } catch {
    return null
  }
}
