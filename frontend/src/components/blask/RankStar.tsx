import { useId } from 'react'
import type { StarLevel } from './ranks'
import { starPath } from './starShape'

/** The star grows with the rank: a small spark, a star, a bright star, the largest one. */
const SHAPES = [
  { r: 28, halo: 34, glow: 0.42, core: 2.8 },
  { r: 34, halo: 42, glow: 0.55, core: 3.2 },
  { r: 41, halo: 50, glow: 0.72, core: 4 },
  { r: 48, halo: 58, glow: 0.9, core: 4.6 },
] as const

/**
 * A rank's star: cobalt into iris with a pearl core in a lavender halo when reached, a dim
 * outline when ahead. Decorative: the rank name is always written next to it.
 */
export function RankStar({
  level,
  size,
  lit = true,
  twinkle = false,
  className = '',
}: {
  level: StarLevel
  size: number
  lit?: boolean
  /** The current rank breathes gently (still under reduced motion). */
  twinkle?: boolean
  className?: string
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const s = SHAPES[level]
  const body = starPath(50, 50, s.r)

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
      className={`blask-star flex-none overflow-visible ${twinkle && lit ? 'blask-star--twinkle' : ''} ${className}`}
    >
      {lit ? (
        <>
          <defs>
            <radialGradient id={`${id}-halo`}>
              <stop
                offset="0"
                style={{
                  stopColor: 'var(--blask-star-halo)',
                  stopOpacity: `min(1, calc(var(--blask-star-glow) * ${s.glow}))`,
                }}
              />
              <stop
                offset="0.3"
                style={{
                  stopColor: 'var(--blask-star-halo)',
                  stopOpacity: `calc(var(--blask-star-glow) * ${s.glow * 0.5})`,
                }}
              />
              <stop offset="1" style={{ stopColor: 'var(--blask-star-halo)', stopOpacity: 0 }} />
            </radialGradient>
            <linearGradient id={`${id}-body`} x1="0.15" y1="0" x2="0.85" y2="1">
              <stop offset="0" style={{ stopColor: 'var(--blask-star-a)' }} />
              <stop offset="1" style={{ stopColor: 'var(--blask-star-b)' }} />
            </linearGradient>
          </defs>
          <circle
            className="blask-star-halo"
            cx="50"
            cy="50"
            r={s.halo}
            fill={`url(#${id}-halo)`}
          />
          <path d={body} fill={`url(#${id}-body)`} />
          <circle
            className="blask-star-core"
            cx="50"
            cy="50"
            r={s.core}
            style={{ fill: 'var(--blask-star-core)' }}
          />
        </>
      ) : (
        <path
          d={body}
          style={{ fill: 'var(--blask-star-dim-fill)', stroke: 'var(--blask-star-dim-line)' }}
          strokeWidth="1.25"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  )
}
