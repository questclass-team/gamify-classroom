import { describe, expect, it } from 'vitest'
import { groupTone, seeded } from './groupTone'

describe('seeded', () => {
  it('repeats the same sequence for the same text', () => {
    const a = seeded('g-1')
    const b = seeded('g-1')
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
  })

  it('stays in [0, 1) and differs between texts', () => {
    const a = seeded('g-1')
    const values = Array.from({ length: 200 }, () => a())
    expect(values.every((value) => value >= 0 && value < 1)).toBe(true)
    expect(seeded('g-1')()).not.toBe(seeded('g-2')())
  })
})

describe('groupTone', () => {
  it('is deterministic per seed and stays on the cobalt to iris arc', () => {
    expect(groupTone('3f6c2b1e-9a4d-4c8e-b1f2-7d5a0e9c4b21')).toEqual(
      groupTone('3f6c2b1e-9a4d-4c8e-b1f2-7d5a0e9c4b21'),
    )
    for (const id of ['g-1', 'g-2', 'g-3', 'a', 'Bazy danych – grupa 2']) {
      const hue = Number(/hsl\((\d+)/.exec(groupTone(id).mid)?.[1])
      expect(hue).toBeGreaterThanOrEqual(198)
      expect(hue).toBeLessThanOrEqual(280)
    }
  })

  it('gives theme-aware paper and highlight', () => {
    const tone = groupTone('g-1')
    expect(tone.tint).toMatch(/^light-dark\(/)
    expect(tone.light).toMatch(/^light-dark\(/)
  })

  it('spreads groups over more than one hue', () => {
    const hues = new Set(
      Array.from({ length: 30 }, (_, i) => /hsl\((\d+)/.exec(groupTone(`g-${i}`).mid)?.[1]),
    )
    expect(hues.size).toBeGreaterThan(2)
  })
})
