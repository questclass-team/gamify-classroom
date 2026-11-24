import { AVATAR_KEYS, type AvatarKey } from '../../api/types'

/** The Polish name of each avatar (its accessible name and the picker's caption). */
const AVATAR_LABEL: Record<AvatarKey, string> = {
  fox: 'Lis',
  owl: 'Sowa',
  hedgehog: 'Jeż',
  cat: 'Kot',
  wolf: 'Wilk',
  raven: 'Kruk',
  dragon: 'Smok',
  phoenix: 'Feniks',
  comet: 'Kometa',
  star: 'Gwiazda',
  moon: 'Księżyc',
  planet: 'Planeta',
  spark: 'Iskra',
  aurora: 'Zorza',
  wave: 'Fala',
  galaxy: 'Galaktyka',
}

/**
 * The preset student avatars (FR-21) in picker order, which is Core's order of the keys. Every
 * avatar is an animal or a sky object drawn as line art, never a face or a letter, so the ranking
 * stays anonymous (NFR-03). `null` means no avatar chosen.
 */
export const AVATARS: readonly { key: AvatarKey; label: string }[] = AVATAR_KEYS.map((key) => ({
  key,
  label: AVATAR_LABEL[key],
}))

/** The label shown for "no avatar chosen". */
export const NO_AVATAR_LABEL = 'Bez awatara'

/** True for one of Core's keys (an unknown one, e.g. from a newer Core, is drawn as none). */
export function isAvatarKey(value: unknown): value is AvatarKey {
  return typeof value === 'string' && (AVATAR_KEYS as readonly string[]).includes(value)
}

/** The avatar's Polish name, or NO_AVATAR_LABEL for none or an unknown key. */
export function avatarLabel(key: string | null): string {
  return isAvatarKey(key) ? AVATAR_LABEL[key] : NO_AVATAR_LABEL
}
