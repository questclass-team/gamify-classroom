import { useMemo, type SVGProps } from 'react'

/** A closed polar curve r(θ) sampled into an SVG path around (0, 0). */
function polarPath(radius: (angle: number) => number, steps = 360) {
  let d = ''
  for (let i = 0; i <= steps; i++) {
    const angle = (i / steps) * Math.PI * 2
    const r = radius(angle)
    d += `${i === 0 ? 'M' : 'L'}${(Math.cos(angle) * r).toFixed(2)} ${(Math.sin(angle) * r).toFixed(2)}`
  }
  return `${d}Z`
}

interface GuillocheProps extends SVGProps<SVGSVGElement> {
  /** Outer radius of the woven band in viewBox units (the viewBox is ±100). */
  outer?: number
  /** Inner radius of the woven band. */
  inner?: number
  /** Lobes per turn. */
  lobes?: number
  /** Strands in the band. */
  strands?: number
}

/** The coin's engraving (a guilloche): a woven band of hairlines and a soft rosette. */
export function ZlotoGuilloche({
  outer = 96,
  inner = 64,
  lobes = 18,
  strands = 14,
  ...props
}: GuillocheProps) {
  const paths = useMemo(() => {
    const mid = (outer + inner) / 2
    const amp = (outer - inner) / 2
    const band = Array.from({ length: strands }, (_, k) =>
      polarPath(
        (a) => mid + amp * Math.sin(lobes * a + (k / strands) * Math.PI * 2) * 0.92,
        lobes * 24,
      ),
    )
    const petals = Array.from({ length: Math.round(strands * 0.7) }, (_, k) =>
      polarPath(
        (a) =>
          inner * 0.5 + inner * 0.36 * Math.sin((lobes / 2) * a + (k / strands) * Math.PI * 2) ** 2,
        lobes * 20,
      ),
    )
    return [...band, ...petals]
  }, [outer, inner, lobes, strands])

  return (
    <svg viewBox="-100 -100 200 200" fill="none" aria-hidden="true" {...props}>
      <circle r={outer + 2} stroke="currentColor" strokeWidth="0.6" />
      <circle r={inner - 2} stroke="currentColor" strokeWidth="0.4" />
      {paths.map((d, i) => (
        <path key={i} d={d} stroke="currentColor" strokeWidth="0.35" />
      ))}
    </svg>
  )
}
