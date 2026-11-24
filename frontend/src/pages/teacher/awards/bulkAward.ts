import { plural } from '../../../format'

/** Awards are sent per student; this many requests run at once. */
export const AWARD_CONCURRENCY = 4

/**
 * Names for a sentence: "Ewa Nowak", "Ewa Nowak i Piotr Zieliński", "A, B i C", and past three
 * "A, B i 4 inne osoby".
 */
export function namesList(names: readonly string[]): string {
  if (names.length <= 1) return names[0] ?? ''
  if (names.length <= 3) return `${names.slice(0, -1).join(', ')} i ${names.at(-1)}`
  const rest = names.length - 2
  return `${names[0]}, ${names[1]} i ${rest} ${plural(rest, 'inna osoba', 'inne osoby', 'innych osób')}`
}

export type BulkAward = { type: 'points'; points: number } | { type: 'badge'; badgeName: string }

/** What one student's request ended with; `duplicate` = 409, the student already has the badge. */
export type BulkOutcome =
  { name: string; status: 'ok' | 'duplicate' } | { name: string; status: 'failed'; error: string }

export interface BulkSummary {
  tone: 'success' | 'info' | 'partial' | 'error'
  title: string
  /** Details per group of students; empty when everything went through. */
  lines: string[]
}

function what(award: BulkAward): string {
  return award.type === 'points'
    ? `+${award.points.toLocaleString('pl-PL')}`
    : `odznakę „${award.badgeName}”`
}

/** The result notice after a batch: who got the award, who already had it, who failed and why. */
export function summarizeBulk(award: BulkAward, outcomes: readonly BulkOutcome[]): BulkSummary {
  const ok = outcomes.filter((outcome) => outcome.status === 'ok').map((outcome) => outcome.name)
  const duplicates = outcomes
    .filter((outcome) => outcome.status === 'duplicate')
    .map((outcome) => outcome.name)
  const failed = outcomes.filter((outcome) => outcome.status === 'failed')

  const lines: string[] = []
  if (duplicates.length > 0) {
    lines.push(
      `${duplicates.length === 1 ? 'Już ma' : 'Już mają'} tę odznakę: ${duplicates.join(', ')}.`,
    )
  }
  for (const outcome of failed) lines.push(`Nie udało się: ${outcome.name}. ${outcome.error}`)

  if (failed.length === outcomes.length) {
    return { tone: 'error', title: `Nie udało się przyznać: ${what(award)}.`, lines }
  }
  if (ok.length === 0) {
    // Only badges can be duplicates, so nobody got anything new.
    return failed.length === 0
      ? {
          tone: 'info',
          title: `${namesList(duplicates)} ${duplicates.length === 1 ? 'ma' : 'mają'} już ${what(award)}.`,
          lines: [],
        }
      : {
          tone: 'partial',
          title:
            award.type === 'badge'
              ? `Nikt nie dostał odznaki „${award.badgeName}”.`
              : `Nie udało się przyznać: ${what(award)}.`,
          lines,
        }
  }
  const title =
    failed.length === 0
      ? `Przyznano ${what(award)}: ${namesList(ok)}.`
      : `Przyznano ${what(award)} dla ${ok.length} z ${outcomes.length} osób: ${namesList(ok)}.`
  return { tone: failed.length === 0 ? 'success' : 'partial', title, lines }
}

/** Case- and diacritics-insensitive text for search ("wojcik" finds "Wójcik"). */
export function foldText(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('pl')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
}

/** Students whose name or login contains the query (all of them for an empty query). */
export function filterStudents<T extends { displayName: string; login: string }>(
  students: readonly T[],
  query: string,
): T[] {
  const folded = foldText(query)
  if (folded === '') return [...students]
  return students.filter(
    (student) =>
      foldText(student.displayName).includes(folded) || foldText(student.login).includes(folded),
  )
}
