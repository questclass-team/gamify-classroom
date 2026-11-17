import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readToken, saveToken } from '../auth/session'
import { ApiError, apiRequest, refreshSession, setUnauthorizedHandler } from './client'

function token(name: string): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'HS256' })}.${encode({ sub: name, exp: Date.now() / 1000 + 900 })}.sig`
}

const OLD_TOKEN = token('old')
const NEW_TOKEN = token('new')
const USER = { id: 'u-1', login: 'student', displayName: 'Ewa Nowak', role: 'student' }

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('apiRequest with refresh', () => {
  const fetchMock = vi.fn<typeof fetch>()
  const onUnauthorized = vi.fn()

  /** Answers /refresh with `refresh` and other URLs with 401 for the old token, 200 for the new one. */
  function backend(refresh: () => Response) {
    fetchMock.mockImplementation(async (input, init) => {
      if (String(input).endsWith('/auth/refresh')) return refresh()
      const authorization = new Headers(init?.headers).get('Authorization')
      return authorization === `Bearer ${NEW_TOKEN}`
        ? json(200, { ok: true })
        : json(401, { title: 'Unauthorized', status: 401 })
    })
  }

  const refreshCalls = () =>
    fetchMock.mock.calls.filter(([input]) => String(input).endsWith('/auth/refresh')).length

  beforeEach(() => {
    sessionStorage.clear()
    saveToken(OLD_TOKEN)
    vi.stubGlobal('fetch', fetchMock)
    setUnauthorizedHandler(onUnauthorized)
  })

  afterEach(() => {
    fetchMock.mockReset()
    onUnauthorized.mockReset()
    vi.unstubAllGlobals()
    setUnauthorizedHandler(null)
  })

  it('refreshes the token on 401, stores it and repeats the request', async () => {
    backend(() => json(200, { accessToken: NEW_TOKEN, user: USER }))

    await expect(apiRequest('/api/core/auth/me')).resolves.toEqual({ ok: true })

    expect(readToken()).toBe(NEW_TOKEN)
    expect(refreshCalls()).toBe(1)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('sends the refresh request without body and without the expired access token', async () => {
    backend(() => json(200, { accessToken: NEW_TOKEN, user: USER }))

    await apiRequest('/api/core/groups')

    const [, init] = fetchMock.mock.calls.find(([input]) =>
      String(input).endsWith('/auth/refresh'),
    )!
    expect(init?.method).toBe('POST')
    expect(init?.body).toBeUndefined()
    expect(new Headers(init?.headers).has('Authorization')).toBe(false)
  })

  it('shares one refresh between requests that fail at the same time', async () => {
    backend(() => json(200, { accessToken: NEW_TOKEN, user: USER }))

    await Promise.all([apiRequest('/a'), apiRequest('/b'), apiRequest('/c')])

    expect(refreshCalls()).toBe(1)
  })

  it('logs the user out when the session cannot be refreshed', async () => {
    backend(() => json(401, { title: 'Auth.InvalidRefreshToken', status: 401 }))

    await expect(apiRequest('/api/core/auth/me')).rejects.toMatchObject({ status: 401 })

    expect(onUnauthorized).toHaveBeenCalledOnce()
    expect(readToken()).toBe(OLD_TOKEN)
  })

  it('does not refresh requests made without authentication, such as login', async () => {
    backend(() => json(200, { accessToken: NEW_TOKEN, user: USER }))

    await expect(
      apiRequest('/api/core/auth/login', { method: 'POST', json: {}, auth: false }),
    ).rejects.toBeInstanceOf(ApiError)

    expect(refreshCalls()).toBe(0)
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('treats a network failure during refresh as an ended session', async () => {
    backend(() => {
      throw new TypeError('Failed to fetch')
    })

    await expect(refreshSession()).resolves.toBeNull()
  })
})
