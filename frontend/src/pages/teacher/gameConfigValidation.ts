import {
  CURRENCY_ICON_MAX_BYTES,
  CURRENCY_ICON_TYPES,
  CURRENCY_NAME_MAX_LENGTH,
  MAX_RANKS,
  RANK_NAME_MAX_LENGTH,
  RANK_THRESHOLD_MAX,
  type Rank,
  type UpdateGameConfigRequest,
} from '../../api/types'

/** Editable rank row; `threshold` is the raw input text. */
export interface RankDraft {
  key: string
  name: string
  threshold: string
}

export interface GameConfigDraft {
  currencyName: string
  ranks: RankDraft[]
}

export interface GameConfigErrors {
  currencyName?: string
  /** Keyed by RankDraft.key. */
  ranks: Record<string, { name?: string; threshold?: string }>
  list?: string
}

export type ValidationResult =
  { valid: true; request: UpdateGameConfigRequest } | { valid: false; errors: GameConfigErrors }

/** Parses a threshold input; returns an error message instead of a number when invalid. */
function parseThreshold(raw: string): number | string {
  const text = raw.trim()
  if (text === '') return 'Podaj próg.'
  const value = Number(text)
  if (!Number.isFinite(value)) return 'Próg musi być liczbą.'
  if (value < 0) return 'Próg nie może być ujemny.'
  if (!Number.isInteger(value)) return 'Próg musi być liczbą całkowitą.'
  if (value > RANK_THRESHOLD_MAX) return `Próg może wynosić najwyżej ${RANK_THRESHOLD_MAX}.`
  return value
}

/**
 * Client-side mirror of the game service rules: currency and rank names are required, thresholds
 * are non-negative integers and unique within the group. Valid ranks are returned sorted.
 */
export function validateGameConfig(draft: GameConfigDraft): ValidationResult {
  const errors: GameConfigErrors = { ranks: {} }
  const currencyName = draft.currencyName.trim()

  if (currencyName === '') errors.currencyName = 'Podaj nazwę waluty.'
  else if (currencyName.length > CURRENCY_NAME_MAX_LENGTH) {
    errors.currencyName = `Nazwa waluty może mieć najwyżej ${CURRENCY_NAME_MAX_LENGTH} znaków.`
  }

  if (draft.ranks.length > MAX_RANKS) errors.list = `Grupa może mieć najwyżej ${MAX_RANKS} rang.`

  const ranks: Rank[] = []
  const nameOwners = new Map<string, string>()
  const thresholdOwners = new Map<number, string>()

  for (const row of draft.ranks) {
    const rowErrors: { name?: string; threshold?: string } = {}
    const name = row.name.trim()
    const nameKey = name.toLocaleLowerCase('pl')

    if (name === '') rowErrors.name = 'Podaj nazwę rangi.'
    else if (name.length > RANK_NAME_MAX_LENGTH) {
      rowErrors.name = `Nazwa rangi może mieć najwyżej ${RANK_NAME_MAX_LENGTH} znaków.`
    } else if (nameOwners.has(nameKey)) rowErrors.name = 'Ta nazwa rangi już występuje.'
    else nameOwners.set(nameKey, name)

    const threshold = parseThreshold(row.threshold)
    if (typeof threshold === 'string') rowErrors.threshold = threshold
    else if (thresholdOwners.has(threshold)) {
      rowErrors.threshold = `Ten próg ma już ranga „${thresholdOwners.get(threshold)}”.`
    } else thresholdOwners.set(threshold, name)

    if (rowErrors.name !== undefined || rowErrors.threshold !== undefined) {
      errors.ranks[row.key] = rowErrors
    } else if (typeof threshold === 'number') {
      ranks.push({ name, threshold })
    }
  }

  const valid =
    errors.currencyName === undefined &&
    errors.list === undefined &&
    Object.keys(errors.ranks).length === 0
  if (!valid) return { valid: false, errors }
  return {
    valid: true,
    request: { currencyName, ranks: ranks.toSorted((a, b) => a.threshold - b.threshold) },
  }
}

/** Error message for an unsupported currency icon, or null when the file can be uploaded. */
export function currencyIconError(file: File): string | null {
  if (!CURRENCY_ICON_TYPES.includes(file.type)) return 'Wybierz plik PNG, GIF lub WebP.'
  if (file.size > CURRENCY_ICON_MAX_BYTES) {
    return `Plik jest za duży (najwyżej ${CURRENCY_ICON_MAX_BYTES / 1024} KB).`
  }
  return null
}
