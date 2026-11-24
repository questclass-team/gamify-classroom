import { useEffect, useId, useRef, useState, type ReactNode, type RefObject } from 'react'
import type { AvatarKey } from '../api/types'
import { Avatar } from '../components/blask/Avatar'
import { ChevronIcon } from '../components/blask/icons'

/** Up to two initials for the avatar disc: "Ewa Nowak" → "EN", "Cichy_Lis" → "C". */
function initials(name: string) {
  const letters = name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0] ?? '')
    .join('')
  return letters.toLocaleUpperCase('pl') || '?'
}

/**
 * The header's account button (the student's avatar or an initials disc, the name from `sm` up, a
 * chevron) and its small menu: a disclosure, not an ARIA menu. Esc, a click outside or leaving it
 * with Tab closes it; opening it moves the focus into it (the first button, or the panel itself
 * when it holds only text).
 */
export function AccountMenu({
  buttonRef,
  label,
  avatar = null,
  children,
}: {
  buttonRef?: RefObject<HTMLButtonElement | null>
  /** The name on the button: the student's nickname, everyone else's name. */
  label: string
  /** The signed-in student's chosen avatar; initials are shown when there is none. */
  avatar?: AvatarKey | null
  /** The menu's content; `close` closes it (call it before an action that opens a dialog). */
  children: (close: () => void) => ReactNode
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const ownButton = useRef<HTMLButtonElement>(null)
  const button = buttonRef ?? ownButton

  useEffect(() => {
    if (!open) return
    const panel = panelRef.current
    ;(panel?.querySelector<HTMLElement>('button, a[href]') ?? panel)?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      button.current?.focus()
    }
    const onOutside = (event: Event) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onOutside)
    document.addEventListener('focusin', onOutside)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onOutside)
      document.removeEventListener('focusin', onOutside)
    }
  }, [open, button])

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="blask-account"
      >
        {avatar !== null ? (
          <Avatar avatar={avatar} size={36} />
        ) : (
          <span aria-hidden="true" className="blask-avatar">
            {initials(label)}
          </span>
        )}
        <span className="max-w-[11rem] truncate max-sm:sr-only">
          <span className="sr-only">Konto: </span>
          {label}
        </span>
        <ChevronIcon className="size-4 text-blask-graphite max-sm:hidden" />
      </button>
      {open && (
        <div
          ref={panelRef}
          id={id}
          tabIndex={-1}
          className="blask-menu blask-pop focus-visible:outline-none"
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  )
}
