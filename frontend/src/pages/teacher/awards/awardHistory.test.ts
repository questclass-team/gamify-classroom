import { describe, expect, it } from 'vitest'
import { mergeHistory } from '../../../api/awardHistory'
import { awardedByLabel, historyMeta } from './awardHistory'

describe('awardedByLabel and historyMeta', () => {
  it('says "Ty" for the signed-in teacher and never shows another id', () => {
    expect(awardedByLabel('u-teacher', 'u-teacher')).toBe('Ty')
    expect(awardedByLabel('u-teacher2', 'u-teacher')).toBe('Inna osoba prowadząca')
  })

  it('puts who before when', () => {
    const [entry] = mergeHistory(
      [
        {
          id: 1,
          points: 10,
          reason: 'Aktywność',
          studentId: 'u-1',
          awardedBy: 'u-teacher',
          createdAt: '2026-11-12T12:00:00Z',
        },
      ],
      [],
    )
    expect(historyMeta(entry, 'u-teacher')).toMatch(/^Ty, 12 lis 2026/)
  })
})
