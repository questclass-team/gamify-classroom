import { apiErrorMessage } from '../../api/errorMessage'
import type { AvatarKey } from '../../api/types'
import { avatarLabel } from '../../components/blask/avatars'

/** The toast after PUT /api/core/me/avatar. */
export function avatarSavedText(avatar: AvatarKey | null): string {
  return avatar === null
    ? 'Usunięto awatar. W rankingach obok nicku stoi teraz pusty znak.'
    : `Zapisano awatar: ${avatarLabel(avatar)}. Widać go obok Twojego nicku w rankingach.`
}

/** Polish message for a failed PUT /api/core/me/avatar (400: a key Core does not know). */
export function avatarSaveError(error: unknown): string {
  return apiErrorMessage(error, { 400: 'Serwer nie przyjął tego awatara. Wybierz inny z listy.' })
}
