import { describe, expect, it } from 'vitest'
import { countValue, easeOutExpo } from './countUp'

describe('easeOutExpo', () => {
  it('starts at 0, ends exactly at 1 and is past half early', () => {
    expect(easeOutExpo(0)).toBe(0)
    expect(easeOutExpo(1)).toBe(1)
    expect(easeOutExpo(0.2)).toBeGreaterThan(0.7)
  })
})

describe('countValue', () => {
  it('counts from one value to another in whole numbers', () => {
    expect(countValue(0, 120, 0, 1000)).toBe(0)
    expect(countValue(0, 120, 1000, 1000)).toBe(120)
    expect(countValue(0, 120, 5000, 1000)).toBe(120)
    expect(Number.isInteger(countValue(0, 120, 333, 1000))).toBe(true)
  })

  it('counts down as well and handles a zero duration', () => {
    expect(countValue(200, 120, 1000, 1000)).toBe(120)
    expect(countValue(0, 50, 0, 0)).toBe(50)
  })
})
