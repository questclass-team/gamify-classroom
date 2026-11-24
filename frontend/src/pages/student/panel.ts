import type { RewardHistoryItem } from '../../api/types'

const DAY_MS = 24 * 60 * 60 * 1000

/** One point of the balance over time: the balance right after `at` (ms since the epoch). */
export interface BalancePoint {
  at: number
  balance: number
}

/**
 * The balance over time from the point rewards (any order): 0 when the student joined the group,
 * the running sum after each reward, and the balance today at `now`. Rewards before `joinedAt`
 * (a student removed and added again) start the line at the first reward instead. The last point
 * is the balance the service reports, so the line always ends at the figure in the hero.
 */
export function balanceSeries(
  rewards: readonly Pick<RewardHistoryItem, 'points' | 'createdAt' | 'id'>[],
  balance: number,
  joinedAt: string,
  now: number,
): BalancePoint[] {
  const sorted = rewards.toSorted(
    (a, b) => Date.parse(a.createdAt) - Date.parse(b.createdAt) || a.id - b.id,
  )
  const first = sorted.length > 0 ? Date.parse(sorted[0].createdAt) : now
  const start = Math.min(Date.parse(joinedAt), first, now)
  const points: BalancePoint[] = [{ at: start, balance: 0 }]
  let sum = 0
  for (const reward of sorted) {
    sum += reward.points
    points.push({ at: Date.parse(reward.createdAt), balance: sum })
  }
  const lastAt = points[points.length - 1].at
  points.push({ at: Math.max(now, lastAt), balance })
  return points
}

/** Points gained in the seven days up to `now`. */
export function weekGain(
  rewards: readonly Pick<RewardHistoryItem, 'points' | 'createdAt'>[],
  now: number,
): number {
  return rewards
    .filter((reward) => {
      const at = Date.parse(reward.createdAt)
      return at <= now && now - at < 7 * DAY_MS
    })
    .reduce((sum, reward) => sum + reward.points, 0)
}

/**
 * A round top for a chart's axis at or above `value`: 1, 1.5, 2, 2.5, 3, 4, 5, 6 or 8 times a
 * power of ten, so the drawing fills most of the height and the middle tick stays round.
 */
export function niceCeiling(value: number): number {
  if (value <= 0) return 10
  const power = 10 ** Math.floor(Math.log10(value))
  const step = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((factor) => factor * power >= value) ?? 10
  return step * power
}
