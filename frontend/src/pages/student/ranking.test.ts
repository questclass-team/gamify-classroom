import { describe, expect, it } from 'vitest'
import type { GroupRanking, RankingEntry } from '../../api/types'
import {
  badgeCountText,
  isPodium,
  isTied,
  myPlaceText,
  parseRankingBy,
  placeText,
  rankingName,
} from './ranking'

function entry(position: number, nickname: string | null, isMe = false): RankingEntry {
  return { position, nickname, balance: 100, rank: null, badgeCount: 1, isMe }
}

function ranking(entries: RankingEntry[], by: GroupRanking['by'] = 'points'): GroupRanking {
  return { groupId: 'g-1', by, currencyName: 'Punkty', currencyIconUrl: null, entries }
}

describe('parseRankingBy', () => {
  it('reads the order from the URL and defaults to points', () => {
    expect(parseRankingBy('badges')).toBe('badges')
    expect(parseRankingBy('points')).toBe('points')
    expect(parseRankingBy(null)).toBe('points')
    expect(parseRankingBy('rank')).toBe('points')
    expect(parseRankingBy('BADGES')).toBe('points')
  })
})

describe('rankingName', () => {
  it('shows the nickname, or a neutral label but never a name', () => {
    expect(rankingName({ nickname: 'Cichy Lis' })).toBe('Cichy Lis')
    expect(rankingName({ nickname: null })).toBe('Student bez nicku')
  })
})

describe('ties and places', () => {
  const entries = [entry(1, 'A'), entry(2, 'B'), entry(2, 'C'), entry(4, null)]

  it('detects shared positions', () => {
    expect(entries.map((item) => isTied(entries, item))).toEqual([false, true, true, false])
  })

  it('writes the place out, with ex aequo for ties', () => {
    expect(placeText(1, false)).toBe('1. miejsce')
    expect(placeText(2, true)).toBe('2. miejsce ex aequo')
  })

  it('marks the first three places, tied ones too', () => {
    expect([1, 2, 3, 4].map(isPodium)).toEqual([true, true, true, false])
  })
})

describe('badgeCountText', () => {
  it('declines the noun', () => {
    expect([0, 1, 2, 5, 22].map(badgeCountText)).toEqual([
      '0 odznak',
      '1 odznaka',
      '2 odznaki',
      '5 odznak',
      '22 odznaki',
    ])
  })
})

describe('myPlaceText', () => {
  it('says where the student is and among how many', () => {
    const data = ranking([entry(1, 'A'), entry(2, null, true), entry(3, 'C')])
    expect(myPlaceText(data)).toBe('Zajmujesz 2. miejsce spośród 3 osób w rankingu punktów.')
  })

  it('mentions a shared place and the badge order', () => {
    const data = ranking([entry(1, 'A'), entry(1, 'Ja', true)], 'badges')
    expect(myPlaceText(data)).toBe(
      'Zajmujesz 1. miejsce ex aequo spośród 2 osób w rankingu odznak.',
    )
  })

  it('handles a group of one and a caller outside the ranking', () => {
    expect(myPlaceText(ranking([entry(1, 'Ja', true)]))).toBe(
      'Zajmujesz 1. miejsce spośród 1 osoby w rankingu punktów.',
    )
    expect(myPlaceText(ranking([entry(1, 'A')]))).toBeNull()
  })
})
