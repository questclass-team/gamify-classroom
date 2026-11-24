import { describe, expect, it } from 'vitest'
import { mergeHistory } from './awardHistory'
import type { Badge, BadgeAward, RewardHistoryItem } from './types'

const badge: Badge = {
  id: 7,
  groupId: 'g-1',
  name: 'Pomocna dłoń',
  description: 'Za pomoc w klasie',
  icon: 'star',
  createdAt: '2026-10-01T08:00:00Z',
}

function reward(id: number, createdAt: string, points = 10): RewardHistoryItem {
  return { id, points, reason: 'Aktywność', studentId: 'u-1', awardedBy: 'u-teacher', createdAt }
}

function award(id: number, createdAt: string): BadgeAward {
  return { id, badgeId: badge.id, badge, studentId: 'u-1', awardedBy: 'u-teacher', createdAt }
}

describe('mergeHistory', () => {
  it('interleaves rewards and badge awards, newest first', () => {
    const merged = mergeHistory(
      [reward(1, '2026-11-01T10:00:00Z'), reward(2, '2026-11-20T10:00:00Z')],
      [award(5, '2026-11-10T10:00:00Z')],
    )
    expect(merged.map((entry) => entry.key)).toEqual(['points-2', 'badge-5', 'points-1'])
  })

  it('keeps a fixed order for equal timestamps: badges first, then the higher id', () => {
    const at = '2026-11-01T10:00:00Z'
    const merged = mergeHistory([reward(1, at), reward(3, at)], [award(2, at)])
    expect(merged.map((entry) => entry.key)).toEqual(['badge-2', 'points-3', 'points-1'])
  })

  it('compares instants, not strings', () => {
    const merged = mergeHistory(
      [reward(1, '2026-11-01T10:00:00.500Z'), reward(2, '2026-11-01T11:00:00+02:00')],
      [],
    )
    // 11:00+02:00 is 09:00Z, earlier than 10:00:00.500Z.
    expect(merged.map((entry) => entry.id)).toEqual([1, 2])
  })

  it('carries what the view needs per kind', () => {
    const [points, badgeEntry] = mergeHistory(
      [reward(1, '2026-11-02T10:00:00Z', 25)],
      [award(4, '2026-11-01T10:00:00Z')],
    )
    expect(points).toMatchObject({ kind: 'points', points: 25, reason: 'Aktywność' })
    expect(badgeEntry).toMatchObject({ kind: 'badge', id: 4, badge: { name: 'Pomocna dłoń' } })
  })

  it('returns an empty history for no data', () => {
    expect(mergeHistory([], [])).toEqual([])
  })
})
