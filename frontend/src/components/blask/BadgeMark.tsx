import { useId, type ReactNode } from 'react'
import type { BadgeIcon } from '../../api/types'
import { starPath } from './starShape'

/** White line art drawn into the glass, on the 44-unit grid of the mark. */
const GLYPHS: Record<BadgeIcon, ReactNode> = {
  medal: (
    <g fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="m16.5 9.5 3.5 7M27.5 9.5l-3.5 7" />
      <circle cx="22" cy="24.5" r="7" />
      <path d={starPath(22, 24.5, 3.6)} fill="#ffffff" stroke="none" />
    </g>
  ),
  star: <path d={starPath(22, 22, 11.5)} fill="#ffffff" />,
  trophy: (
    <g fill="none" stroke="#ffffff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 11.5h12v5.5a6 6 0 0 1-12 0z" />
      <path d="M16 13.5h-2.25a2.75 2.75 0 0 0 2.6 3.7M28 13.5h2.25a2.75 2.75 0 0 1-2.6 3.7" />
      <path d="M22 23v4.5M18 31h8" />
    </g>
  ),
}

/**
 * A badge as a small liquid-glass coin: cobalt into iris with a pearl rim and highlight, the
 * badge's icon drawn in white inside. Decorative: the badge name is always written next to it.
 */
export function BadgeMark({ icon, size = 44 }: { icon: BadgeIcon; size?: number }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      aria-hidden="true"
      focusable="false"
      className="flex-none"
      fill="none"
    >
      <defs>
        <radialGradient id={`${id}-glass`} cx="0.35" cy="0.3" r="0.85">
          <stop offset="0" stopColor="#c9d2ff" />
          <stop offset="0.35" stopColor="#7d8cff" />
          <stop offset="0.7" stopColor="#2b3bff" />
          <stop offset="1" stopColor="#6c3bf4" />
        </radialGradient>
        <linearGradient id={`${id}-shine`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.55" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r="19" fill={`url(#${id}-glass)`} />
      <path
        d="M8 19c3-8 11-11 18-10 5 1 8 4 10 7-7-2-13-2-19 0-3 1-6 2-9 3z"
        fill={`url(#${id}-shine)`}
      />
      {GLYPHS[icon]}
      <circle cx="22" cy="22" r="19.6" stroke="#fbfaff" strokeWidth="1.6" />
      <circle cx="22" cy="22" r="18.2" stroke="#ffffff" strokeOpacity="0.5" strokeWidth="0.8" />
    </svg>
  )
}
