import type { Rank, RankRef } from '../../api/types'
import type { StarLevel } from '../../components/blask/ranks'

/**
 * Genitive plural of common currency nouns (the teacher names the currency freely, in the
 * nominative plural: "Złote monety", "Punkty").
 */
const NOUN_GENITIVE_PLURAL: Record<string, string> = {
  monety: 'monet',
  punkty: 'punktów',
  gwiazdy: 'gwiazd',
  gwiazdki: 'gwiazdek',
  żetony: 'żetonów',
  kryształy: 'kryształów',
  diamenty: 'diamentów',
  dukaty: 'dukatów',
  klejnoty: 'klejnotów',
  talary: 'talarów',
  perły: 'pereł',
  muszelki: 'muszelek',
  kamienie: 'kamieni',
  złocisze: 'złociszy',
  grosze: 'groszy',
  orły: 'orłów',
  kredyty: 'kredytów',
  tokeny: 'tokenów',
  coiny: 'coinów',
  sztabki: 'sztabek',
  medale: 'medali',
}

function withCaseOf(source: string, word: string): string {
  return source[0] === source[0].toLocaleUpperCase('pl')
    ? word[0].toLocaleUpperCase('pl') + word.slice(1)
    : word
}

/**
 * The currency after "brakuje 180 …": "Złote monety" → "Złotych monet", "Punkty doświadczenia"
 * → "Punktów doświadczenia". The first known noun is declined, adjectives before it ("-e" →
 * "-ych"/"-ich"), words after it stay; null when no known noun is found, so the caller can avoid
 * a wrong form.
 */
export function currencyGenitivePlural(name: string): string | null {
  const words = name.trim().split(/\s+/)
  const nounIndex = words.findIndex(
    (word) => NOUN_GENITIVE_PLURAL[word.toLocaleLowerCase('pl')] !== undefined,
  )
  if (nounIndex === -1) return null
  const before = words.slice(0, nounIndex)
  if (before.some((word) => !word.toLocaleLowerCase('pl').endsWith('e'))) return null
  const declined = [
    ...before.map((word) =>
      /[kg]ie$/i.test(word) ? word.replace(/e$/i, 'ch') : word.replace(/e$/i, 'ych'),
    ),
    withCaseOf(
      words[nounIndex],
      NOUN_GENITIVE_PLURAL[words[nounIndex].toLocaleLowerCase('pl')] ?? '',
    ),
    ...words.slice(nounIndex + 1),
  ]
  return declined.join(' ')
}

/** "180 Złotych monet", or "1 (Złote monety)" where the plural form cannot be used or found. */
export function amountInWords(amount: number, currencyName: string): string {
  const formatted = amount.toLocaleString('pl-PL')
  const genitive = amount === 1 ? null : currencyGenitivePlural(currencyName)
  return genitive === null ? `${formatted} (${currencyName})` : `${formatted} ${genitive}`
}

/** The ranks the student's state reveals: the current one and the next (the API sends no more). */
export function knownRanks(rank: RankRef | null, nextRank: RankRef | null): Rank[] {
  return [rank, nextRank].filter((item): item is Rank => item !== null)
}

/** Progress to the next rank in words, e.g. "Do rangi Rycerz brakuje 180 Złotych monet." */
export function nextRankText(state: {
  balance: number
  rank: RankRef | null
  nextRank: RankRef | null
  currencyName: string
}): string {
  const { balance, rank, nextRank, currencyName } = state
  if (nextRank === null) {
    return rank === null ? 'Ta grupa nie ma jeszcze rang.' : 'Masz najwyższą rangę w tej grupie.'
  }
  const missing = Math.max(0, nextRank.threshold - balance)
  return `Do rangi ${nextRank.name} brakuje ${amountInWords(missing, currencyName)}.`
}

/**
 * Star sizes for the current and the next rank when only those two are known: the first rank's
 * small spark below any rank, the largest star at the top rank, the middle sizes in between.
 */
export function knownStarLevels(
  rank: RankRef | null,
  nextRank: RankRef | null,
): { current: StarLevel; next: StarLevel } {
  if (rank === null) return { current: 0, next: 0 }
  if (nextRank === null) return { current: 3, next: 3 }
  return { current: 1, next: 2 }
}
