import { RANKING_BY, type GroupRanking, type RankingBy, type RankingEntry } from '../../api/types'
import { plural } from '../../format'

/** What everyone sees for a member without a nickname; never a name or login (NFR-03). */
export const NO_NICKNAME = 'Student bez nicku'

export const RANKING_BY_LABEL: Record<RankingBy, string> = {
  points: 'Punkty',
  badges: 'Odznaki',
}

/** `?by=` from the URL; anything unknown falls back to the default order by points. */
export function parseRankingBy(value: string | null): RankingBy {
  return RANKING_BY.find((by) => by === value) ?? 'points'
}

export function rankingName(entry: Pick<RankingEntry, 'nickname'>): string {
  return entry.nickname ?? NO_NICKNAME
}

/** True when another entry shares the position (1, 1, 3). */
export function isTied(entries: readonly RankingEntry[], entry: RankingEntry): boolean {
  return entries.some((other) => other !== entry && other.position === entry.position)
}

/** "2. miejsce" or "2. miejsce ex aequo", as a screen reader hears the position. */
export function placeText(position: number, tied: boolean): string {
  return `${position}. miejsce${tied ? ' ex aequo' : ''}`
}

export function badgeCountText(count: number): string {
  return `${count.toLocaleString('pl-PL')} ${plural(count, 'odznaka', 'odznaki', 'odznak')}`
}

/**
 * The signed-in student's place in one sentence, e.g. "Zajmujesz 2. miejsce ex aequo spośród
 * 7 osób w rankingu odznak."; null when the caller is not in the entries (a teacher).
 */
export function myPlaceText(ranking: GroupRanking): string | null {
  const me = ranking.entries.find((entry) => entry.isMe)
  if (me === undefined) return null
  const total = ranking.entries.length
  const among = `spośród ${total} ${plural(total, 'osoby', 'osób', 'osób')}`
  const order = ranking.by === 'points' ? 'punktów' : 'odznak'
  const tied = isTied(ranking.entries, me) ? ' ex aequo' : ''
  return `Zajmujesz ${me.position}. miejsce${tied} ${among} w rankingu ${order}.`
}
