import { ApiError } from '../../api/client'
import { apiErrorMessage } from '../../api/errorMessage'
import { NICKNAME_MAX_LENGTH, NICKNAME_MIN_LENGTH } from '../../api/types'

/** Letters (with their combining marks) and digits of any script, spaces, '_', '-' and '.'. */
const ALLOWED = /^[\p{L}\p{M}\p{Nd} ._-]*$/u
/** Starts with a letter or digit and ends with a letter (or its mark) or digit. */
const EDGES = /^[\p{L}\p{Nd}](?:.*[\p{L}\p{M}\p{Nd}])?$/su

/** The rules in one sentence, for the field's hint and the server's 400. */
export const NICKNAME_RULES = `Od ${NICKNAME_MIN_LENGTH} do ${NICKNAME_MAX_LENGTH} znaków: litery, cyfry, spacje i znaki „_”, „-”, „.”; na początku i na końcu litera lub cyfra.`

/** The nickname as Core stores it: trimmed and composed to Unicode NFC. */
export function normalizeNickname(raw: string): string {
  return raw.trim().normalize('NFC')
}

/**
 * Core's nickname rules (User.IsValidNickname), checked before sending so the student learns
 * what to fix in Polish; null when the nickname is valid. Uniqueness is only known to Core (409).
 */
export function nicknameError(raw: string): string | null {
  const nickname = normalizeNickname(raw)
  if (nickname === '') return 'Wpisz nick.'
  if (!ALLOWED.test(nickname)) {
    return 'Nick może zawierać tylko litery, cyfry, spacje i znaki „_”, „-”, „.”.'
  }
  if (!EDGES.test(nickname)) return 'Nick musi zaczynać się i kończyć literą lub cyfrą.'
  if (nickname.length < NICKNAME_MIN_LENGTH) {
    return `Nick musi mieć co najmniej ${NICKNAME_MIN_LENGTH} znaki.`
  }
  if (nickname.length > NICKNAME_MAX_LENGTH) {
    return `Nick może mieć najwyżej ${NICKNAME_MAX_LENGTH} znaki.`
  }
  return null
}

/** Polish message for a failed PUT /api/core/me/profile. */
export function nicknameSaveError(error: unknown): string {
  if (error instanceof ApiError && error.status === 409) {
    return 'Ten nick jest już zajęty. Wybierz inny.'
  }
  if (error instanceof ApiError && error.status === 400) {
    return `Serwer nie przyjął tego nicku. ${NICKNAME_RULES}`
  }
  return apiErrorMessage(error)
}
