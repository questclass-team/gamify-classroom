import { UNIT } from './content'

/**
 * An amount of points as the landing writes it: the number in the surrounding text colour, the
 * unit in the light (cobalt on paper and in product fragments, lavender inside `.blask-on-night`).
 */
export function Amount({ value, signed = false }: { value: number; signed?: boolean }) {
  const sign = value < 0 ? '−' : signed && value > 0 ? '+' : ''
  return (
    <span className="blask-num">
      {sign}
      {Math.abs(value)}
      <span className="blask-amount-g"> {UNIT}</span>
    </span>
  )
}
