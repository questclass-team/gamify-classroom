// JWT lives in sessionStorage: survives reloads, dies with the tab.
// Expired or malformed tokens are dropped on read.

const STORAGE_KEY = 'questclass.token'

function decodePayload(token: string): Record<string, unknown> | null {
  const parts = token.split('.')
  if (parts.length !== 3) return null
  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (char) => char.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))
    return typeof payload === 'object' && payload !== null
      ? (payload as Record<string, unknown>)
      : null
  } catch {
    return null
  }
}

/** Expiry time in ms since epoch, or null if the token has no valid `exp`. */
export function getTokenExpiry(token: string): number | null {
  const exp = decodePayload(token)?.exp
  return typeof exp === 'number' ? exp * 1000 : null
}

export function readToken(now: number = Date.now()): string | null {
  const token = sessionStorage.getItem(STORAGE_KEY)
  if (token === null) return null
  const expiry = getTokenExpiry(token)
  if (expiry === null || expiry <= now) {
    sessionStorage.removeItem(STORAGE_KEY)
    return null
  }
  return token
}

export function saveToken(token: string): void {
  sessionStorage.setItem(STORAGE_KEY, token)
}

export function clearToken(): void {
  sessionStorage.removeItem(STORAGE_KEY)
}
