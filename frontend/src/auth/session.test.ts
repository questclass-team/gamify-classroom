import { beforeEach, describe, expect, it } from 'vitest'
import { readToken, saveToken } from './session'

function tokenWithPayload(payload: object): string {
  const encode = (value: object) => btoa(JSON.stringify(value)).replace(/=+$/, '')
  return `${encode({ alg: 'none' })}.${encode(payload)}.sig`
}

describe('readToken', () => {
  const now = 1_700_000_000_000

  beforeEach(() => sessionStorage.clear())

  it('returns a token that has not expired yet', () => {
    const token = tokenWithPayload({ exp: now / 1000 + 60 })
    saveToken(token)
    expect(readToken(now)).toBe(token)
  })

  it('drops an expired token from storage', () => {
    saveToken(tokenWithPayload({ exp: now / 1000 - 1 }))
    expect(readToken(now)).toBeNull()
    expect(readToken(0)).toBeNull()
  })

  it('rejects tokens without exp or with a malformed payload', () => {
    saveToken(tokenWithPayload({ sub: 'u-1' }))
    expect(readToken(now)).toBeNull()
    saveToken('not-a-jwt')
    expect(readToken(now)).toBeNull()
  })
})
