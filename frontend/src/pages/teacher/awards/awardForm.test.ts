import { describe, expect, it } from 'vitest'
import { POINTS_MAX, REWARD_REASON_MAX_LENGTH } from '../../../api/types'
import { amountError, validateNewBadge, validatePointsAward } from './awardForm'

describe('amountError', () => {
  it.each(['1', '20', ' 15 ', '+5', String(POINTS_MAX)])('accepts %j', (value) => {
    expect(amountError(value)).toBeNull()
  })

  it.each([
    ['', 'Podaj, ile przyznać.'],
    ['   ', 'Podaj, ile przyznać.'],
    ['abc', 'Wpisz liczbę, np. 10.'],
    ['1e3', 'Wpisz liczbę, np. 10.'],
    ['2.5', 'Wpisz liczbę całkowitą, bez części ułamkowej.'],
    ['2,5', 'Wpisz liczbę całkowitą, bez części ułamkowej.'],
    ['0', 'Przyznaj co najmniej 1.'],
    ['-10', 'Przyznaj co najmniej 1.'],
    [String(POINTS_MAX + 1), `Jednorazowo możesz przyznać najwyżej ${POINTS_MAX}.`],
  ])('rejects %j', (value, message) => {
    expect(amountError(value)).toBe(message)
  })
})

describe('validatePointsAward', () => {
  it('returns the request with a number and a trimmed reason', () => {
    expect(validatePointsAward({ amount: ' 20 ', reason: '  Aktywność na zajęciach ' }, 3)).toEqual(
      {
        valid: true,
        request: { points: 20, reason: 'Aktywność na zajęciach' },
      },
    )
  })

  it('requires a reason, at most the API limit after trimming', () => {
    expect(validatePointsAward({ amount: '5', reason: '   ' }, 1)).toEqual({
      valid: false,
      errors: { reason: 'Napisz, za co przyznajesz. Student zobaczy to w historii.' },
    })
    const tooLong = 'x'.repeat(REWARD_REASON_MAX_LENGTH + 1)
    expect(validatePointsAward({ amount: '5', reason: tooLong }, 1)).toEqual({
      valid: false,
      errors: { reason: `Uzasadnienie może mieć najwyżej ${REWARD_REASON_MAX_LENGTH} znaków.` },
    })
    const longest = ` ${'x'.repeat(REWARD_REASON_MAX_LENGTH)} `
    expect(validatePointsAward({ amount: '5', reason: longest }, 1).valid).toBe(true)
  })

  it('reports every problem at once, including an empty selection', () => {
    expect(validatePointsAward({ amount: '0', reason: '' }, 0)).toEqual({
      valid: false,
      errors: {
        amount: 'Przyznaj co najmniej 1.',
        reason: 'Napisz, za co przyznajesz. Student zobaczy to w historii.',
        selection: 'Zaznacz na liście co najmniej jedną osobę.',
      },
    })
  })
})

describe('validateNewBadge', () => {
  it('trims the name and description and keeps the icon', () => {
    expect(
      validateNewBadge({
        name: ' Pomocna dłoń ',
        description: ' Za pomoc w klasie ',
        icon: 'star',
      }),
    ).toEqual({
      valid: true,
      request: { name: 'Pomocna dłoń', description: 'Za pomoc w klasie', icon: 'star' },
    })
  })

  it('allows an empty description', () => {
    expect(validateNewBadge({ name: 'Seria', description: '', icon: 'medal' }).valid).toBe(true)
  })

  it('rejects an empty or too long name and a too long description', () => {
    expect(validateNewBadge({ name: '  ', description: 'x'.repeat(201), icon: 'trophy' })).toEqual({
      valid: false,
      errors: {
        name: 'Podaj nazwę odznaki.',
        description: 'Opis może mieć najwyżej 200 znaków.',
      },
    })
    expect(validateNewBadge({ name: 'x'.repeat(41), description: '', icon: 'trophy' })).toEqual({
      valid: false,
      errors: { name: 'Nazwa może mieć najwyżej 40 znaków.' },
    })
  })
})
