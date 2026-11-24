import type { ButtonHTMLAttributes } from 'react'
import { Link, type LinkProps } from 'react-router'
import { buttonClass, type ButtonLook } from './buttonClass'
import { SpinnerIcon } from './icons'

/**
 * A Blask button. `busy` keeps it focusable and announced (aria-disabled, not disabled), shows the
 * spinner and `busyLabel`, and swallows clicks until the action ends. Icons go in `children`
 * before the label (no arrows in labels).
 */
export function Button({
  variant,
  size,
  busy = false,
  busyLabel,
  type = 'button',
  className,
  children,
  onClick,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonLook & {
    busy?: boolean
    /** Label while busy, e.g. "Zapisywanie…"; the normal label stays when omitted. */
    busyLabel?: string
  }) {
  return (
    <button
      type={type}
      className={buttonClass({ variant, size, className })}
      data-busy={busy || undefined}
      aria-disabled={busy || undefined}
      onClick={(event) => {
        if (busy) event.preventDefault()
        else onClick?.(event)
      }}
      {...props}
    >
      {busy && <SpinnerIcon />}
      {busy && busyLabel !== undefined ? busyLabel : children}
    </button>
  )
}

/** A router link that looks like a button (navigation, not an action). */
export function LinkButton({ variant, size, className, ...props }: LinkProps & ButtonLook) {
  return (
    <Link
      className={buttonClass({ variant, size, className: `no-underline ${className ?? ''}` })}
      {...props}
    />
  )
}
