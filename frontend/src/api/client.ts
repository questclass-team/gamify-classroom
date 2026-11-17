import { readToken } from '../auth/session'
import type { ProblemDetails } from './types'

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

/** Called on 401 from an authenticated request (expired/revoked token). */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  /** Serialized as JSON request body. */
  json?: unknown
  /** Multipart body (file uploads); the browser sets Content-Type with the boundary. */
  formData?: FormData
  /** Attach the stored JWT (default true). */
  auth?: boolean
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', json, formData, auth = true, signal } = options
  const headers = new Headers({ Accept: 'application/json' })
  if (json !== undefined) headers.set('Content-Type', 'application/json')
  if (auth) {
    const token = readToken()
    if (token !== null) headers.set('Authorization', `Bearer ${token}`)
  }

  let response: Response
  try {
    response = await fetch(path, {
      method,
      headers,
      body: formData ?? (json === undefined ? undefined : JSON.stringify(json)),
      signal,
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error
    throw new ApiError(0, null, 'Network error')
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

async function readProblem(response: Response): Promise<ProblemDetails | null> {
  try {
    const body: unknown = await response.json()
    return typeof body === 'object' && body !== null ? (body as ProblemDetails) : null
  } catch {
    return null
  }
}
