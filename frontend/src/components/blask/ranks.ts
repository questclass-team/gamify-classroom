import type { Rank } from '../../api/types'

export interface RankProgress {
  /** Highest rank whose threshold is at or below the balance; null when none is reached. */
  current: Rank | null
  /** Lowest rank above the balance; null at the top rank or when the group has no ranks. */
  next: Rank | null
  /** Way from the current rank's threshold (or 0) to the next one, 0…1; 1 at the top rank. */
  share: number
  /** Points still missing for the next rank; null when there is no next rank. */
  toNext: number | null
  /** Position of the current rank among the ranks sorted by threshold; -1 when none. */
  index: number
  count: number
}

/** Same rule as the game service: the highest threshold at or below the balance. */
export function rankForBalance(balance: number, ranks: readonly Rank[]): Rank | null {
  return rankProgress(balance, ranks).current
}

export function rankProgress(balance: number, ranks: readonly Rank[]): RankProgress {
  const sorted = ranks.toSorted((a, b) => a.threshold - b.threshold)
  const index = sorted.findLastIndex((rank) => rank.threshold <= balance)
  const current = index === -1 ? null : sorted[index]
  const next = sorted[index + 1] ?? null
  if (next === null) {
    return {
      current,
      next,
      share: current === null ? 0 : 1,
      toNext: null,
      index,
      count: sorted.length,
    }
  }
  const from = current?.threshold ?? 0
  const share = Math.min(1, Math.max(0, (balance - from) / (next.threshold - from)))
  return { current, next, share, toNext: next.threshold - balance, index, count: sorted.length }
}

/** Plain-language progress, so it never depends on colour or the drawn line. */
export function rankProgressText(progress: RankProgress): string {
  if (progress.count === 0) return 'Grupa nie ma jeszcze rang.'
  if (progress.next === null) return 'Najwyższa ranga w tej grupie.'
  return `Brakuje ${progress.toNext} do rangi ${progress.next.name}.`
}

export type StarLevel = 0 | 1 | 2 | 3

/** Star size of the rank at `index` among `count` ranks: the first is level 0, the last 3. */
export function starLevel(index: number, count: number): StarLevel {
  if (count <= 1 || index <= 0) return 0
  return Math.min(3, Math.round((index / (count - 1)) * 3)) as StarLevel
}
