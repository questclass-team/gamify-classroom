import { ApiError } from '../../api/client'
import { apiErrorMessage } from '../../api/errorMessage'

export type LoginField = 'login' | 'password'

export interface LoginProblem {
  message: string
  /** Fields to mark invalid; the first one gets the focus. */
  fields: readonly LoginField[]
}

export const LOGIN_ERRORS = {
  401: 'Nieprawidłowy login lub hasło.',
  403: 'Twoje konto nie zostało zaimportowane do systemu. Skontaktuj się z administratorem.',
}

/** Checks the form before it is sent: both fields are required. */
export function checkLoginForm(login: string, password: string): LoginProblem | null {
  const fields: LoginField[] = []
  if (login.trim() === '') fields.push('login')
  if (password === '') fields.push('password')
  return fields.length === 0 ? null : { message: 'Podaj login i hasło.', fields }
}

/**
 * The server's refusal as the form shows it. Wrong credentials mark both fields; an account that
 * is not imported, or a failure of the server, is not the fields' fault.
 */
export function loginFailure(error: unknown): LoginProblem {
  const wrong = error instanceof ApiError && error.status === 401
  return {
    message: apiErrorMessage(error, LOGIN_ERRORS),
    fields: wrong ? ['login', 'password'] : [],
  }
}

/** Back to the page that required the login, but only inside the user's own area. */
export function loginTarget(from: unknown, home: string): string {
  return typeof from === 'string' && from.startsWith(home) ? from : home
}
