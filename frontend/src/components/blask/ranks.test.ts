import { describe, expect, it } from 'vitest'
import { rankForBalance, rankProgress, rankProgressText, starLevel } from './ranks'

// Deliberately unsorted: the configuration may come in any order.
const ranks = [
  { name: 'Rycerz', threshold: 300 },
  { name: 'Nowicjusz', threshold: 0 },
  { name: 'Giermek', threshold: 100 },
]

describe('rankProgress', () => {
  it('measures the way from the current threshold to the next', () => {
    expect(rankProgress(120, ranks)).toEqual({
      current: { name: 'Giermek', threshold: 100 },
      next: { name: 'Rycerz', threshold: 300 },
      share: 0.1,
      toNext: 180,
      index: 1,
      count: 3,
    })
  })

  it('reaches a rank exactly at its threshold', () => {
    const progress = rankProgress(100, ranks)
    expect(progress.current?.name).toBe('Giermek')
    expect(progress.share).toBe(0)
    expect(progress.toNext).toBe(200)
  })

  it('is complete at the top rank', () => {
    expect(rankProgress(5000, ranks)).toMatchObject({
      current: { name: 'Rycerz' },
      next: null,
      share: 1,
      toNext: null,
      index: 2,
    })
  })

  it('counts from zero while below the first threshold', () => {
    const progress = rankProgress(30, [{ name: 'Giermek', threshold: 120 }])
    expect(progress).toMatchObject({ current: null, index: -1, share: 0.25, toNext: 90 })
  })

  it('handles a group without ranks', () => {
    expect(rankProgress(50, [])).toEqual({
      current: null,
      next: null,
      share: 0,
      toNext: null,
      index: -1,
      count: 0,
    })
  })
})

describe('rankForBalance', () => {
  it('follows the game service: the highest threshold at or below the balance', () => {
    expect(rankForBalance(0, ranks)?.name).toBe('Nowicjusz')
    expect(rankForBalance(299, ranks)?.name).toBe('Giermek')
    expect(rankForBalance(300, ranks)?.name).toBe('Rycerz')
    expect(rankForBalance(10, [{ name: 'Giermek', threshold: 100 }])).toBeNull()
  })
})

describe('rankProgressText', () => {
  it('writes the progress out in words', () => {
    expect(rankProgressText(rankProgress(120, ranks))).toBe('Brakuje 180 do rangi Rycerz.')
    expect(rankProgressText(rankProgress(300, ranks))).toBe('Najwyższa ranga w tej grupie.')
    expect(rankProgressText(rankProgress(0, []))).toBe('Grupa nie ma jeszcze rang.')
  })
})

describe('starLevel', () => {
  it('grows the star from the first rank to the last', () => {
    expect([0, 1, 2].map((index) => starLevel(index, 3))).toEqual([0, 2, 3])
    expect([0, 1, 2, 3].map((index) => starLevel(index, 4))).toEqual([0, 1, 2, 3])
    expect(starLevel(0, 1)).toBe(0)
    expect(starLevel(-1, 3)).toBe(0)
  })
})
