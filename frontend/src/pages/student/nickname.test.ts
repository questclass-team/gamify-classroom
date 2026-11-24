import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { nicknameError, nicknameSaveError, normalizeNickname } from './nickname'

describe('nicknameError', () => {
  it.each([
    'Cichy Lis',
    'kot_42',
    'Ala-Ma.Kota',
    'Żółw',
    'Волк',
    '李小龍',
    'a1b',
    'x'.repeat(24),
    '  Cichy Lis  ',
  ])('accepts %j', (nickname) => {
    expect(nicknameError(nickname)).toBeNull()
  })

  it('asks for a nickname when the field is empty or blank', () => {
    expect(nicknameError('')).toBe('Wpisz nick.')
    expect(nicknameError('   ')).toBe('Wpisz nick.')
  })

  it('checks the length after trimming', () => {
    expect(nicknameError('ab')).toBe('Nick musi mieć co najmniej 3 znaki.')
    expect(nicknameError('  ab  ')).toBe('Nick musi mieć co najmniej 3 znaki.')
    expect(nicknameError('x'.repeat(25))).toBe('Nick może mieć najwyżej 24 znaki.')
  })

  it('counts a letter typed with a combining accent once, like Core after NFC', () => {
    // "Kró" with "o" + U+0301 is three characters once composed.
    expect(nicknameError('Kro\u0301')).toBeNull()
    expect(normalizeNickname(' Kro\u0301 ')).toBe('Kró')
  })

  it.each(['Cichy@Lis', 'kot!', 'emoji🙂ok', 'tab\there'])(
    'rejects other characters: %j',
    (nickname) => {
      expect(nicknameError(nickname)).toBe(
        'Nick może zawierać tylko litery, cyfry, spacje i znaki „_”, „-”, „.”.',
      )
    },
  )

  it.each(['_kot', 'kot_', '.kot', 'kot-', 'kot.'])(
    'wants a letter or digit at both ends: %j',
    (nickname) => {
      expect(nicknameError(nickname)).toBe('Nick musi zaczynać się i kończyć literą lub cyfrą.')
    },
  )
})

describe('nicknameSaveError', () => {
  it('says the nickname is taken for 409', () => {
    const error = new ApiError(409, { title: 'Profile.NicknameTaken', status: 409 }, 'taken')
    expect(nicknameSaveError(error)).toBe('Ten nick jest już zajęty. Wybierz inny.')
  })

  it('repeats the rules for 400', () => {
    const error = new ApiError(400, { errors: { Nickname: ['…'] } }, 'invalid')
    expect(nicknameSaveError(error)).toBe(
      'Serwer nie przyjął tego nicku. Od 3 do 24 znaków: litery, cyfry, spacje i znaki „_”, „-”, „.”; na początku i na końcu litera lub cyfra.',
    )
  })

  it('falls back to the general messages', () => {
    expect(nicknameSaveError(new ApiError(0, null, 'Network error'))).toBe(
      'Brak połączenia z serwerem. Spróbuj ponownie później.',
    )
  })
})
