import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { checkLoginForm, LOGIN_ERRORS, loginFailure, loginTarget } from './loginForm'

describe('checkLoginForm', () => {
  it('accepts a login and a password', () => {
    expect(checkLoginForm(' student ', 'haslo')).toBeNull()
  })

  it.each([
    ['', 'haslo', ['login']],
    ['   ', 'haslo', ['login']],
    ['student', '', ['password']],
    ['', '', ['login', 'password']],
  ])('names the empty fields (%j, %j)', (login, password, fields) => {
    expect(checkLoginForm(login, password)).toEqual({ message: 'Podaj login i hasło.', fields })
  })
})

describe('loginFailure', () => {
  it('marks both fields for wrong credentials', () => {
    expect(loginFailure(new ApiError(401, null, 'x'))).toEqual({
      message: LOGIN_ERRORS[401],
      fields: ['login', 'password'],
    })
  })

  it('explains an account that is not imported without blaming the fields', () => {
    expect(loginFailure(new ApiError(403, null, 'x'))).toEqual({
      message: LOGIN_ERRORS[403],
      fields: [],
    })
  })

  it('reports a lost connection and unknown failures', () => {
    expect(loginFailure(new ApiError(0, null, 'x')).message).toBe(
      'Brak połączenia z serwerem. Spróbuj ponownie później.',
    )
    expect(loginFailure(new Error('boom')).message).toBe(
      'Wystąpił błąd serwera. Spróbuj ponownie później.',
    )
  })
})

describe('loginTarget', () => {
  it('returns to a page inside the role area', () => {
    expect(loginTarget('/teacher/groups/g-1', '/teacher')).toBe('/teacher/groups/g-1')
  })

  it('goes home from anywhere else', () => {
    expect(loginTarget('/admin', '/teacher')).toBe('/teacher')
    expect(loginTarget(undefined, '/student')).toBe('/student')
    expect(loginTarget(42, '/student')).toBe('/student')
  })
})
