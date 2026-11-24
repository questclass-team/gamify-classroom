/**
 * Blask's four-point star as an SVG path: concave arms meeting in a soft waist around (cx, cy),
 * arm length r. Shared by the rank stars, the currency coin and the star badge.
 */
export function starPath(cx: number, cy: number, r: number): string {
  const p = r * 0.07
  return [
    `M${cx} ${cy - r}`,
    `Q${cx + p} ${cy - p} ${cx + r} ${cy}`,
    `Q${cx + p} ${cy + p} ${cx} ${cy + r}`,
    `Q${cx - p} ${cy + p} ${cx - r} ${cy}`,
    `Q${cx - p} ${cy - p} ${cx} ${cy - r}Z`,
  ].join(' ')
}
