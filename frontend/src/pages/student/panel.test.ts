import { describe, expect, it } from 'vitest'
import { balanceSeries, niceCeiling, weekGain } from './panel'

const NOW = Date.parse('2026-11-24T12:00:00Z')

function reward(id: number, points: number, createdAt: string) {
  return { id, points, createdAt }
}

describe('balanceSeries', () => {
  it('runs from 0 at joining through every reward to the balance today', () => {
    const series = balanceSeries(
      [reward(2, 60, '2026-10-27T10:00:00Z'), reward(1, 40, '2026-10-13T09:00:00Z')],
      100,
      '2026-10-06T08:00:00Z',
      NOW,
    )
    expect(series).toEqual([
      { at: Date.parse('2026-10-06T08:00:00Z'), balance: 0 },
      { at: Date.parse('2026-10-13T09:00:00Z'), balance: 40 },
      { at: Date.parse('2026-10-27T10:00:00Z'), balance: 100 },
      { at: NOW, balance: 100 },
    ])
  })

  it('is a flat line at 0 without rewards', () => {
    expect(balanceSeries([], 0, '2026-10-06T08:00:00Z', NOW)).toEqual([
      { at: Date.parse('2026-10-06T08:00:00Z'), balance: 0 },
      { at: NOW, balance: 0 },
    ])
  })

  it('starts at the first reward when it is older than joining', () => {
    const series = balanceSeries(
      [reward(1, 10, '2026-10-01T09:00:00Z')],
      10,
      '2026-10-06T08:00:00Z',
      NOW,
    )
    expect(series[0]).toEqual({ at: Date.parse('2026-10-01T09:00:00Z'), balance: 0 })
  })

  it('orders rewards at the same moment by id', () => {
    const at = '2026-11-01T09:00:00Z'
    const series = balanceSeries(
      [reward(5, 5, at), reward(4, 10, at)],
      15,
      '2026-10-06T08:00:00Z',
      NOW,
    )
    expect(series.map((point) => point.balance)).toEqual([0, 10, 15, 15])
  })
})

describe('weekGain', () => {
  it('sums the rewards of the last seven days', () => {
    expect(
      weekGain(
        [
          reward(1, 25, '2026-11-23T12:00:00Z'),
          reward(2, 10, '2026-11-17T12:00:01Z'),
          reward(3, 40, '2026-11-17T12:00:00Z'),
          reward(4, 99, '2026-11-25T12:00:00Z'),
        ],
        NOW,
      ),
    ).toBe(35)
    expect(weekGain([], NOW)).toBe(0)
  })
})

describe('niceCeiling', () => {
  it.each([
    [0, 10],
    [7, 8],
    [10, 10],
    [11, 15],
    [125, 150],
    [240, 250],
    [330, 400],
    [1200, 1500],
  ])('%i -> %i', (value, expected) => {
    expect(niceCeiling(value)).toBe(expected)
  })
})
