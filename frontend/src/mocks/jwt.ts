// Unsigned JWT-shaped tokens for the mock backend. Never used against real services.

function base64UrlEncode(value: object): string {
  return btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createMockToken(userId: string, ttlSeconds: number): string {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds
  return `${base64UrlEncode({ alg: 'none', typ: 'JWT' })}.${base64UrlEncode({ sub: userId, exp })}.mock`
}

/** Returns the user id from a valid, unexpired `Bearer` header, else null. */
export function readMockBearer(authorization: string | null): string | null {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1]
  if (token === undefined) return null
  try {
    const payload: unknown = JSON.parse(
      atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
    )
    if (typeof payload !== 'object' || payload === null) return null
    const { sub, exp } = payload as { sub?: unknown; exp?: unknown }
    if (typeof sub !== 'string' || typeof exp !== 'number' || exp * 1000 <= Date.now()) return null
    return sub
  } catch {
    return null
  }
}
