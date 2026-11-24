import {
  BADGE_DESCRIPTION_MAX_LENGTH,
  BADGE_ICONS,
  BADGE_NAME_MAX_LENGTH,
  POINTS_MAX,
  REWARD_REASON_MAX_LENGTH,
  type AwardPointsRequest,
  type BadgeIcon,
  type CreateBadgeRequest,
} from '../../../api/types'

/** Amount and reason as typed in the award form. */
export interface PointsDraft {
  amount: string
  reason: string
}

export type PointsErrors = { amount?: string; reason?: string; selection?: string }

export type PointsValidation =
  { valid: true; request: Required<AwardPointsRequest> } | { valid: false; errors: PointsErrors }

const NUMBER = /^[+-]?\d+([.,]\d+)?$/

/** Error for the amount field, or null when it is an integer in 1…POINTS_MAX. */
export function amountError(raw: string): string | null {
  const value = raw.trim()
  if (value === '') return 'Podaj, ile przyznać.'
  if (!NUMBER.test(value)) return 'Wpisz liczbę, np. 10.'
  if (!/^[+-]?\d+$/.test(value)) return 'Wpisz liczbę całkowitą, bez części ułamkowej.'
  const amount = Number(value)
  if (amount < 1) return 'Przyznaj co najmniej 1.'
  if (amount > POINTS_MAX) return `Jednorazowo możesz przyznać najwyżej ${POINTS_MAX}.`
  return null
}

/**
 * Checks the award form against the game service's rules. The reason is required here although
 * the API accepts an empty one: FR-14 asks for a justification and the history shows it.
 */
export function validatePointsAward(draft: PointsDraft, selectedCount: number): PointsValidation {
  const errors: PointsErrors = {}
  const amount = amountError(draft.amount)
  if (amount !== null) errors.amount = amount

  const reason = draft.reason.trim()
  if (reason === '') errors.reason = 'Napisz, za co przyznajesz. Student zobaczy to w historii.'
  else if (reason.length > REWARD_REASON_MAX_LENGTH) {
    errors.reason = `Uzasadnienie może mieć najwyżej ${REWARD_REASON_MAX_LENGTH} znaków.`
  }

  if (selectedCount === 0) errors.selection = 'Zaznacz na liście co najmniej jedną osobę.'

  if (Object.keys(errors).length > 0) return { valid: false, errors }
  return { valid: true, request: { points: Number(draft.amount.trim()), reason } }
}

export interface BadgeDraft {
  name: string
  description: string
  icon: BadgeIcon
}

export type BadgeErrors = { name?: string; description?: string }

export type BadgeValidation =
  { valid: true; request: Required<CreateBadgeRequest> } | { valid: false; errors: BadgeErrors }

/** Rules of POST /badges: a 1–40 character trimmed name, a description up to 200, a known icon. */
export function validateNewBadge(draft: BadgeDraft): BadgeValidation {
  const errors: BadgeErrors = {}
  const name = draft.name.trim()
  if (name === '') errors.name = 'Podaj nazwę odznaki.'
  else if (name.length > BADGE_NAME_MAX_LENGTH) {
    errors.name = `Nazwa może mieć najwyżej ${BADGE_NAME_MAX_LENGTH} znaków.`
  }
  const description = draft.description.trim()
  if (description.length > BADGE_DESCRIPTION_MAX_LENGTH) {
    errors.description = `Opis może mieć najwyżej ${BADGE_DESCRIPTION_MAX_LENGTH} znaków.`
  }
  if (Object.keys(errors).length > 0) return { valid: false, errors }
  const icon = BADGE_ICONS.includes(draft.icon) ? draft.icon : 'medal'
  return { valid: true, request: { name, description, icon } }
}
