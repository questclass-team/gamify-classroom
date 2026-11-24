import { describe, expect, it } from 'vitest'
import {
  amountInWords,
  currencyGenitivePlural,
  knownRanks,
  knownStarLevels,
  nextRankText,
} from './progress'

const giermek = { name: 'Giermek', threshold: 100 }
const rycerz = { name: 'Rycerz', threshold: 300 }

describe('currencyGenitivePlural', () => {
  it.each([
    ['Złote monety', 'Złotych monet'],
    ['Punkty', 'Punktów'],
    ['punkty', 'punktów'],
    ['Wielkie gwiazdy', 'Wielkich gwiazd'],
    ['Srebrne żetony', 'Srebrnych żetonów'],
    ['Punkty doświadczenia', 'Punktów doświadczenia'],
    ['  Perły  ', 'Pereł'],
  ])('%j → %j', (name, expected) => {
    expect(currencyGenitivePlural(name)).toBe(expected)
  })

  it('gives up rather than guess an unknown word', () => {
    expect(currencyGenitivePlural('Fasolki')).toBeNull()
    expect(currencyGenitivePlural('Złoto')).toBeNull()
    expect(currencyGenitivePlural('Dobry punkty')).toBeNull()
  })
})

describe('amountInWords', () => {
  it('declines the currency after a number', () => {
    expect(amountInWords(180, 'Złote monety')).toBe('180 Złotych monet')
    expect(amountInWords(2, 'Punkty')).toBe('2 Punktów')
    expect(amountInWords(1500, 'Punkty')).toBe('1500 Punktów')
  })

  it('names the currency in brackets for one or an unknown word', () => {
    expect(amountInWords(1, 'Złote monety')).toBe('1 (Złote monety)')
    expect(amountInWords(40, 'Fasolki')).toBe('40 (Fasolki)')
  })
})

describe('nextRankText', () => {
  const base = { currencyName: 'Złote monety' }

  it('says how much is missing for the next rank', () => {
    expect(nextRankText({ ...base, balance: 120, rank: giermek, nextRank: rycerz })).toBe(
      'Do rangi Rycerz brakuje 180 Złotych monet.',
    )
  })

  it('works below the first rank', () => {
    expect(nextRankText({ ...base, balance: 30, rank: null, nextRank: giermek })).toBe(
      'Do rangi Giermek brakuje 70 Złotych monet.',
    )
  })

  it('covers the top rank and a group without ranks', () => {
    expect(nextRankText({ ...base, balance: 900, rank: rycerz, nextRank: null })).toBe(
      'Masz najwyższą rangę w tej grupie.',
    )
    expect(nextRankText({ ...base, balance: 50, rank: null, nextRank: null })).toBe(
      'Ta grupa nie ma jeszcze rang.',
    )
  })
})

describe('knownRanks', () => {
  it('keeps the ranks the state names, in order', () => {
    expect(knownRanks(giermek, rycerz)).toEqual([giermek, rycerz])
    expect(knownRanks(null, giermek)).toEqual([giermek])
    expect(knownRanks(rycerz, null)).toEqual([rycerz])
    expect(knownRanks(null, null)).toEqual([])
  })
})

describe('knownStarLevels', () => {
  it('sizes the stars from what the state reveals', () => {
    expect(knownStarLevels(null, giermek)).toEqual({ current: 0, next: 0 })
    expect(knownStarLevels(giermek, rycerz)).toEqual({ current: 1, next: 2 })
    expect(knownStarLevels(rycerz, null)).toEqual({ current: 3, next: 3 })
  })
})
