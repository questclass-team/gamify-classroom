import { describe, expect, it } from 'vitest'
import { CURRENCY_ICON_MAX_BYTES, RANK_THRESHOLD_MAX } from '../../api/types'
import { currencyIconError, validateGameConfig, type RankDraft } from './gameConfigValidation'

function rank(key: string, name: string, threshold: string): RankDraft {
  return { key, name, threshold }
}

describe('validateGameConfig', () => {
  it('accepts a valid config, trims names and sorts ranks by threshold', () => {
    const result = validateGameConfig({
      currencyName: '  Złote monety ',
      ranks: [
        rank('a', ' Rycerz ', '300'),
        rank('b', 'Nowicjusz', '0'),
        rank('c', 'Giermek', '100'),
      ],
    })
    expect(result).toEqual({
      valid: true,
      request: {
        currencyName: 'Złote monety',
        ranks: [
          { name: 'Nowicjusz', threshold: 0 },
          { name: 'Giermek', threshold: 100 },
          { name: 'Rycerz', threshold: 300 },
        ],
      },
    })
  })

  it('accepts a config without ranks', () => {
    expect(validateGameConfig({ currencyName: 'Punkty', ranks: [] }).valid).toBe(true)
  })

  it.each([
    ['-1', 'Próg nie może być ujemny.'],
    ['1.5', 'Próg musi być liczbą całkowitą.'],
    ['', 'Podaj próg.'],
    ['abc', 'Próg musi być liczbą.'],
    [String(RANK_THRESHOLD_MAX + 1), `Próg może wynosić najwyżej ${RANK_THRESHOLD_MAX}.`],
  ])('rejects threshold %j', (threshold, message) => {
    const result = validateGameConfig({
      currencyName: 'Punkty',
      ranks: [rank('a', 'Nowicjusz', threshold)],
    })
    expect(result).toEqual({ valid: false, errors: { ranks: { a: { threshold: message } } } })
  })

  it('accepts the boundary thresholds 0 and the maximum', () => {
    const result = validateGameConfig({
      currencyName: 'Punkty',
      ranks: [rank('a', 'Start', '0'), rank('b', 'Mistrz', String(RANK_THRESHOLD_MAX))],
    })
    expect(result.valid).toBe(true)
  })

  it('flags only the later rank when a threshold repeats', () => {
    const result = validateGameConfig({
      currencyName: 'Punkty',
      ranks: [rank('a', 'Giermek', '100'), rank('b', 'Rycerz', '100')],
    })
    expect(result).toEqual({
      valid: false,
      errors: { ranks: { b: { threshold: 'Ten próg ma już ranga „Giermek”.' } } },
    })
  })

  it('treats rank names case-insensitively when checking duplicates', () => {
    const result = validateGameConfig({
      currencyName: 'Punkty',
      ranks: [rank('a', 'Rycerz', '0'), rank('b', 'RYCERZ', '50')],
    })
    expect(result).toEqual({
      valid: false,
      errors: { ranks: { b: { name: 'Ta nazwa rangi już występuje.' } } },
    })
  })

  it('requires the currency name and rank names', () => {
    const result = validateGameConfig({ currencyName: '   ', ranks: [rank('a', ' ', '10')] })
    expect(result).toEqual({
      valid: false,
      errors: { currencyName: 'Podaj nazwę waluty.', ranks: { a: { name: 'Podaj nazwę rangi.' } } },
    })
  })
})

describe('currencyIconError', () => {
  it('accepts small PNG, GIF and WebP files', () => {
    for (const type of ['image/png', 'image/gif', 'image/webp']) {
      expect(currencyIconError(new File(['x'], 'coin', { type }))).toBeNull()
    }
  })

  it('rejects other types and files over the size limit', () => {
    expect(currencyIconError(new File(['x'], 'coin.jpg', { type: 'image/jpeg' }))).toBe(
      'Wybierz plik PNG, GIF lub WebP.',
    )
    const big = new File([new Uint8Array(CURRENCY_ICON_MAX_BYTES + 1)], 'coin.png', {
      type: 'image/png',
    })
    expect(currencyIconError(big)).toMatch(/za duży/)
  })
})
