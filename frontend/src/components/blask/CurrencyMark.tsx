import { useId } from 'react'
import { starPath } from './starShape'

/** A group's currency: its name and the icon the teacher uploaded (null = Blask's own coin). */
export interface Currency {
  name: string
  iconUrl: string | null
}

/**
 * The currency next to an amount: the group's own icon when it has one (drawn crisp, icons are
 * usually small pixel art), otherwise Blask's coin, a drop of cobalt-into-iris glass with a pearl
 * star in it. Decorative: say the currency in text next to it.
 */
export function CurrencyMark({
  iconUrl,
  className = 'size-4',
}: {
  iconUrl: string | null
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  if (iconUrl !== null) {
    return (
      <img
        src={iconUrl}
        alt=""
        className={`flex-none object-contain [image-rendering:pixelated] ${className}`}
      />
    )
  }
  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      focusable="false"
      className={`flex-none ${className}`}
    >
      <defs>
        <radialGradient id={id} cx="0.34" cy="0.28" r="0.9">
          <stop offset="0" stopColor="#c9d2ff" />
          <stop offset="0.45" stopColor="#5866ff" />
          <stop offset="0.8" stopColor="#2b3bff" />
          <stop offset="1" stopColor="#6c3bf4" />
        </radialGradient>
      </defs>
      <circle cx="10" cy="10" r="9" fill={`url(#${id})`} />
      <circle cx="10" cy="10" r="8.6" fill="none" stroke="#fbfaff" strokeOpacity="0.85" />
      <path d={starPath(10, 10, 5.2)} fill="#ffffff" />
    </svg>
  )
}

/**
 * An amount with the currency mark, in tabular numerals ("+20", "120"). Screen readers hear the
 * number followed by the currency name.
 */
export function Amount({
  value,
  currency,
  signed = false,
  className = '',
  markClassName = 'size-[1em]',
}: {
  value: number
  currency: Currency
  /** Show "+" before positive values (awards). */
  signed?: boolean
  className?: string
  markClassName?: string
}) {
  return (
    <span className={`blask-num inline-flex items-center gap-[0.3em] ${className}`}>
      {signed && value > 0 ? '+' : ''}
      {value.toLocaleString('pl-PL')}
      <CurrencyMark iconUrl={currency.iconUrl} className={markClassName} />
      <span className="sr-only">{currency.name}</span>
    </span>
  )
}
