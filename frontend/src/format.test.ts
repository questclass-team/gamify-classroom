import { describe, expect, it } from 'vitest'
import { plural } from './format'

describe('plural', () => {
  it.each([
    [1, 'osoba'],
    [2, 'osoby'],
    [4, 'osoby'],
    [5, 'osób'],
    [12, 'osób'],
    [14, 'osób'],
    [22, 'osoby'],
    [25, 'osób'],
  ])('%i → %s', (count, word) => {
    expect(plural(count, 'osoba', 'osoby', 'osób')).toBe(word)
  })
})
