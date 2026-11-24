import type { Badge, BadgeAward, RewardHistoryItem } from './types'

/** One line of a student's award history: a point reward or an (active) badge award. */
export type HistoryEntry =
  | {
      kind: 'points'
      key: string
      id: number
      createdAt: string
      awardedBy: string
      points: number
      reason: string
    }
  | {
      kind: 'badge'
      key: string
      id: number
      createdAt: string
      awardedBy: string
      badge: Badge
    }

/**
 * Point rewards and badge awards as one history, newest first. Equal timestamps keep a fixed
 * order (badges before points, then the higher id first), so the list never jumps on re-render.
 * The game service lists them separately (teacher endpoints, the student's `…/me`).
 */
export function mergeHistory(
  rewards: readonly RewardHistoryItem[],
  awards: readonly BadgeAward[],
): HistoryEntry[] {
  const entries: HistoryEntry[] = [
    ...rewards.map((reward): HistoryEntry => ({
      kind: 'points',
      key: `points-${reward.id}`,
      id: reward.id,
      createdAt: reward.createdAt,
      awardedBy: reward.awardedBy,
      points: reward.points,
      reason: reward.reason,
    })),
    ...awards.map((award): HistoryEntry => ({
      kind: 'badge',
      key: `badge-${award.id}`,
      id: award.id,
      createdAt: award.createdAt,
      awardedBy: award.awardedBy,
      badge: award.badge,
    })),
  ]
  return entries.sort(
    (a, b) =>
      Date.parse(b.createdAt) - Date.parse(a.createdAt) ||
      (a.kind === b.kind ? 0 : a.kind === 'badge' ? -1 : 1) ||
      b.id - a.id,
  )
}
