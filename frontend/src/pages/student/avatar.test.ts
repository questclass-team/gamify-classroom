import { describe, expect, it } from 'vitest'
import { ApiError } from '../../api/client'
import { avatarSavedText, avatarSaveError } from './avatar'

describe('avatarSavedText', () => {
  it('names the chosen avatar in Polish', () => {
    expect(avatarSavedText('hedgehog')).toBe(
      'Zapisano awatar: Jeż. Widać go obok Twojego nicku w rankingach.',
    )
  })

  it('confirms a removal', () => {
    expect(avatarSavedText(null)).toBe(
      'Usunięto awatar. W rankingach obok nicku stoi teraz pusty znak.',
    )
  })
})

describe('avatarSaveError', () => {
  it('explains a key Core rejected (400 errors.Avatar)', () => {
    const error = new ApiError(400, { errors: { Avatar: ['…'] } }, 'invalid')
    expect(avatarSaveError(error)).toBe('Serwer nie przyjął tego awatara. Wybierz inny z listy.')
  })

  it('falls back to the shared messages', () => {
    expect(avatarSaveError(new ApiError(0, null, 'Network error'))).toBe(
      'Brak połączenia z serwerem. Spróbuj ponownie później.',
    )
    expect(avatarSaveError(new Error('boom'))).toBe(
      'Wystąpił błąd serwera. Spróbuj ponownie później.',
    )
  })
})
