import { useId } from 'react'

/**
 * A four-point star in Blask's evening: a pearl star with a rotated inner glint, in a
 * halo that cools from pearl through lavender to cobalt. `weight` (0–1) sets its brightness.
 */
export function NagrodySpark({
  weight,
  size,
  className = '',
}: {
  weight: number
  size: number
  className?: string
}) {
  const id = useId()
  const glow = 0.35 + weight * 0.6
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      className={`overflow-visible ${className}`}
    >
      <defs>
        <radialGradient id={`${id}-halo`}>
          <stop offset="0" stopColor="#fbfaff" stopOpacity={glow} />
          <stop offset="0.22" stopColor="#8e9bff" stopOpacity={glow * 0.6} />
          <stop offset="0.55" stopColor="#2b3bff" stopOpacity={glow * 0.26} />
          <stop offset="1" stopColor="#2b3bff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <circle cx="50" cy="50" r="50" fill={`url(#${id}-halo)`} />
      <path
        d="M50 4 Q52.6 47.4 96 50 Q52.6 52.6 50 96 Q47.4 52.6 4 50 Q47.4 47.4 50 4Z"
        fill="#fbfaff"
      />
      <path
        d="M50 26 Q51.4 48.6 74 50 Q51.4 51.4 50 74 Q48.6 51.4 26 50 Q48.6 48.6 50 26Z"
        fill="#ffffff"
        transform="rotate(45 50 50)"
        opacity={0.35 + weight * 0.5}
      />
      <circle cx="50" cy="50" r={3 + weight * 2.5} fill="#ffffff" />
    </svg>
  )
}
