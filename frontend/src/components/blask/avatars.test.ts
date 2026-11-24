import { describe, expect, it } from 'vitest'
import { AVATAR_KEYS } from '../../api/types'
import { AVATAR_TONE, avatarArt } from './art'
import { AVATARS, avatarLabel, isAvatarKey, NO_AVATAR_LABEL } from './avatars'

describe('AVATAR_KEYS', () => {
  it("is Core's list, in Core's order (docs/api.md, Avatars.Keys)", () => {
    expect(AVATAR_KEYS).toEqual([
      'fox',
      'owl',
      'hedgehog',
      'cat',
      'wolf',
      'raven',
      'dragon',
      'phoenix',
      'comet',
      'star',
      'moon',
      'planet',
      'spark',
      'aurora',
      'wave',
      'galaxy',
    ])
  })

  it('gives the picker every key once, in that order, with a distinct Polish name', () => {
    expect(AVATARS.map((avatar) => avatar.key)).toEqual(AVATAR_KEYS)
    const labels = AVATARS.map((avatar) => avatar.label)
    expect(new Set(labels).size).toBe(labels.length)
    expect(labels).not.toContain(NO_AVATAR_LABEL)
    expect(labels.every((label) => label.trim() !== '')).toBe(true)
  })

  it('never gives two neighbours in the picker the same tone', () => {
    AVATAR_KEYS.slice(1).forEach((key, index) => {
      expect(AVATAR_TONE[key]).not.toBe(AVATAR_TONE[AVATAR_KEYS[index]])
    })
  })
})

describe('isAvatarKey', () => {
  it.each(AVATAR_KEYS)('accepts %s', (key) => {
    expect(isAvatarKey(key)).toBe(true)
  })

  it.each([null, undefined, '', 'Fox', 'FOX', ' fox', 'unicorn', 1, {}])('rejects %j', (value) => {
    expect(isAvatarKey(value)).toBe(false)
  })
})

describe('avatarLabel', () => {
  it('names an avatar, and none or an unknown key as no avatar', () => {
    expect(avatarLabel('fox')).toBe('Lis')
    expect(avatarLabel('galaxy')).toBe('Galaktyka')
    expect(avatarLabel(null)).toBe('Bez awatara')
    expect(avatarLabel('unicorn')).toBe('Bez awatara')
  })
})

describe('avatarArt', () => {
  it('draws the neutral mark without gradients for no avatar', () => {
    const art = avatarArt(null, { uid: 'a', theme: 'light', size: 32 })
    expect(art.defs).toEqual([])
    expect(art.nodes.length).toBeGreaterThan(0)
  })

  it('keeps gradient ids unique per instance', () => {
    const art = avatarArt('fox', { uid: 'u1', theme: 'dark', size: 32 })
    expect(art.defs.map((node) => node.attrs.id)).toEqual(['u1-body', 'u1-pool', 'u1-shine'])
  })
})
