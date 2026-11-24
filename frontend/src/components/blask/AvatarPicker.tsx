import { useId } from 'react'
import type { AvatarKey } from '../../api/types'
import { Avatar } from './Avatar'
import { AVATARS, NO_AVATAR_LABEL } from './avatars'
import { CheckIcon } from './icons'

const OPTIONS: readonly { key: AvatarKey | null; label: string }[] = [
  ...AVATARS,
  { key: null, label: NO_AVATAR_LABEL },
]

/**
 * The avatar picker: a radio group of the sixteen avatars and "Bez awatara". Native radios, so the
 * arrow keys move the choice, Tab enters and leaves the group, and a form gets the key ('' for
 * none). Each option is a tile with the disc and its name; the chosen one is lit with a cobalt
 * ring and a pearl check. The focused radio carries the attribute `data-autofocus`, so a Dialog
 * opens with the focus on the current choice.
 */
export function AvatarPicker({
  value,
  onChange,
  name = 'avatar',
  legend = 'Twój awatar',
}: {
  value: AvatarKey | null
  onChange: (value: AvatarKey | null) => void
  name?: string
  legend?: string
}) {
  const id = useId()
  return (
    <fieldset className="blask-avatar-picker">
      <legend className="blask-avatar-picker__legend">{legend}</legend>
      <div className="blask-avatar-picker__grid">
        {OPTIONS.map((option) => {
          const checked = option.key === value
          const inputId = `${id}-${option.key ?? 'none'}`
          return (
            <label key={inputId} htmlFor={inputId} className="blask-avatar-option">
              <input
                id={inputId}
                type="radio"
                name={name}
                value={option.key ?? ''}
                checked={checked}
                data-autofocus={checked || undefined}
                onChange={() => onChange(option.key)}
                className="sr-only"
              />
              <span className="blask-avatar-option__disc">
                <Avatar avatar={option.key} size={48} />
                <span aria-hidden="true" className="blask-avatar-option__check">
                  <CheckIcon className="size-3 [stroke-width:3]" />
                </span>
              </span>
              <span className="blask-avatar-option__label">{option.label}</span>
            </label>
          )
        })}
      </div>
    </fieldset>
  )
}
