import { ApiError } from './client'

/** Polish, user-facing message for a failed request; `byStatus` overrides per HTTP status. */
export function apiErrorMessage(error: unknown, byStatus: Record<number, string> = {}): string {
  if (error instanceof ApiError) {
    const specific = byStatus[error.status]
    if (specific !== undefined) return specific
    if (error.status === 0) return 'Brak połączenia z serwerem. Spróbuj ponownie później.'
    if (error.status === 403) return 'Brak uprawnień do wykonania tej operacji.'
  }
  return 'Wystąpił błąd serwera. Spróbuj ponownie później.'
}
