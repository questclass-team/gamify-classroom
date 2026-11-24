import { useEffect, useId, useRef, useState } from 'react'
import type { RankRef } from '../../api/types'
import type { Currency } from '../../components/blask/CurrencyMark'
import { dateFormat } from '../../format'
import { niceCeiling, type BalancePoint } from './panel'
import { useInView } from './useInView'

const H = 230
const PAD = { left: 44, right: 16, top: 26, bottom: 34 }
/** Dots on every reward only while they stay apart; a long history is the line alone. */
const MAX_DOTS = 24

const shortDate = new Intl.DateTimeFormat('pl-PL', { day: 'numeric', month: 'short' })

/**
 * Monotone cubic interpolation (Fritsch–Carlson) as cubic Béziers, as in the lab's chart: smooth,
 * through every point, never overshooting, so a balance that only grows never seems to dip.
 */
function smoothPath(points: readonly [number, number][]): string {
  const n = points.length
  if (n === 1) return `M${points[0][0]},${points[0][1]}`
  const slopes: number[] = []
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    slopes.push((y1 - y0) / (x1 - x0))
  }
  const tangents = points.map((_, i) => {
    if (i === 0) return slopes[0]
    if (i === n - 1) return slopes[n - 2]
    const a = slopes[i - 1]
    const b = slopes[i]
    return a * b <= 0 ? 0 : (a + b) / 2
  })
  for (let i = 0; i < n - 1; i++) {
    const s = slopes[i]
    if (s === 0) {
      tangents[i] = 0
      tangents[i + 1] = 0
      continue
    }
    const alpha = tangents[i] / s
    const beta = tangents[i + 1] / s
    const h = Math.hypot(alpha, beta)
    if (h > 3) {
      tangents[i] = (3 / h) * alpha * s
      tangents[i + 1] = (3 / h) * beta * s
    }
  }
  let d = `M${points[0][0].toFixed(1)},${points[0][1].toFixed(1)}`
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = points[i]
    const [x1, y1] = points[i + 1]
    const dx = (x1 - x0) / 3
    d += ` C${(x0 + dx).toFixed(1)},${(y0 + tangents[i] * dx).toFixed(1)} ${(x1 - dx).toFixed(1)},${(y1 - tangents[i + 1] * dx).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`
  }
  return d
}

/**
 * The balance over time (the lab's "Złoto w semestrze" chart, drawn from the real rewards): a
 * cobalt line from joining the group to today, a peri area fading under it, the next rank's
 * threshold as a dashed goal. The line draws once when it comes into view (not under reduced
 * motion). The drawing is decorative; a table with the same numbers is there for screen readers.
 */
export function BalanceChart({
  points,
  currency,
  nextRank,
}: {
  points: readonly BalancePoint[]
  currency: Currency
  nextRank: RankRef | null
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const rootRef = useRef<HTMLElement>(null)
  const shown = useInView(rootRef)
  const [W, setW] = useState(640)

  // The drawing follows the real width, so the labels keep their size on a phone.
  useEffect(() => {
    const element = rootRef.current
    if (element === null) return
    const observer = new ResizeObserver(([entry]) => {
      const width = Math.round(entry?.contentRect.width ?? 640)
      if (width > 0) setW(Math.max(260, width))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  const first = points[0]
  const last = points[points.length - 1]
  const balance = last.balance
  // Some air above the highest value (the goal line's label sits over it).
  const top = niceCeiling(Math.max(4, balance, nextRank?.threshold ?? 0) * 1.1)
  const span = Math.max(1, last.at - first.at)
  const x = (at: number) => PAD.left + ((at - first.at) / span) * (W - PAD.left - PAD.right)
  const y = (value: number) => PAD.top + (1 - value / top) * (H - PAD.top - PAD.bottom)

  // Rewards given at one moment share a point (the later sum wins).
  const coords: [number, number][] = []
  for (const point of points) {
    const xy: [number, number] = [x(point.at), y(point.balance)]
    if (coords.length > 0 && Math.abs(coords[coords.length - 1][0] - xy[0]) < 0.5) {
      coords[coords.length - 1] = xy
    } else coords.push(xy)
  }
  const line = smoothPath(coords)
  const base = H - PAD.bottom
  const area = `${line} L${coords[coords.length - 1][0].toFixed(1)},${base} L${coords[0][0].toFixed(1)},${base} Z`
  const rewardDots = coords.slice(1, -1)
  const ticks = Number.isInteger(top / 2) ? [0, top / 2, top] : [0, top]
  const end = coords[coords.length - 1]
  const goal = nextRank !== null ? y(nextRank.threshold) : null
  const middle = points.length > 2 ? first.at + span / 2 : null

  return (
    <figure ref={rootRef} className="blask-chart" data-shown={shown}>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full overflow-visible" aria-hidden="true">
        <defs>
          <linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" style={{ stopColor: 'var(--blask-chart-area)' }} stopOpacity="0.7" />
            <stop offset="1" style={{ stopColor: 'var(--blask-chart-area)' }} stopOpacity="0" />
          </linearGradient>
        </defs>
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(tick)}
              y2={y(tick)}
              style={{ stroke: 'var(--color-blask-line)' }}
              strokeDasharray={tick === 0 ? undefined : '3 5'}
            />
            <text
              x={PAD.left - 10}
              y={y(tick) + 4}
              textAnchor="end"
              fontSize="12"
              style={{ fill: 'var(--color-blask-graphite)' }}
              className="blask-num"
            >
              {tick.toLocaleString('pl-PL')}
            </text>
          </g>
        ))}
        {goal !== null && nextRank !== null && (
          <g>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={goal}
              y2={goal}
              style={{ stroke: 'var(--color-blask-iris)' }}
              strokeOpacity="0.55"
              strokeDasharray="6 5"
            />
            <text
              x={W - PAD.right}
              y={goal - 7}
              textAnchor="end"
              fontSize="12"
              fontWeight="600"
              style={{ fill: 'var(--color-blask-iris)' }}
            >
              {nextRank.name}
            </text>
          </g>
        )}
        <path className="blask-chart-area" d={area} fill={`url(#${id}-fill)`} />
        <path
          className="blask-chart-line"
          d={line}
          pathLength={1}
          fill="none"
          style={{ stroke: 'var(--color-blask-cobalt)' }}
          strokeWidth="2.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {rewardDots.length <= MAX_DOTS &&
          rewardDots.map(([px, py], i) => (
            <circle
              key={i}
              className="blask-chart-dot"
              cx={px}
              cy={py}
              r={3.5}
              style={{ fill: 'var(--color-blask-white)', stroke: 'var(--color-blask-cobalt)' }}
              strokeWidth="2"
            />
          ))}
        <circle
          className="blask-chart-dot"
          cx={end[0]}
          cy={end[1]}
          r={5.5}
          style={{ fill: 'var(--color-blask-cobalt)', stroke: 'var(--color-blask-cobalt)' }}
          strokeWidth="2"
        />
        <text
          x={end[0] - 2}
          y={end[1] - 13}
          textAnchor="end"
          fontSize="13"
          fontWeight="600"
          style={{ fill: 'var(--color-blask-ink)' }}
          className="blask-num"
        >
          {balance.toLocaleString('pl-PL')}
        </text>
        <text
          x={PAD.left}
          y={H - 10}
          textAnchor="start"
          fontSize="12"
          style={{ fill: 'var(--color-blask-graphite)' }}
        >
          {shortDate.format(first.at)}
        </text>
        {middle !== null && W >= 420 && (
          <text
            x={x(middle)}
            y={H - 10}
            textAnchor="middle"
            fontSize="12"
            style={{ fill: 'var(--color-blask-graphite)' }}
          >
            {shortDate.format(middle)}
          </text>
        )}
        <text
          x={W - PAD.right}
          y={H - 10}
          textAnchor="end"
          fontSize="12"
          style={{ fill: 'var(--color-blask-graphite)' }}
        >
          dziś
        </text>
      </svg>
      <figcaption className="mt-1 flex justify-between gap-4 text-[0.8125rem] text-blask-graphite">
        <span>Saldo, {currency.name}</span>
        <span>Od dołączenia do grupy</span>
      </figcaption>
      {/* A table ignores the sr-only box size; the wrapper keeps it from widening the page. */}
      <div className="sr-only">
        <table>
          <caption>
            Saldo po kolejnych nagrodach ({currency.name})
            {nextRank !== null
              ? `; następna ranga, ${nextRank.name}, od ${nextRank.threshold.toLocaleString('pl-PL')}`
              : ''}
          </caption>
          <thead>
            <tr>
              <th scope="col">Data</th>
              <th scope="col">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point, i) => (
              <tr key={i}>
                <td>
                  {i === 0
                    ? `${dateFormat.format(point.at)} (dołączenie)`
                    : i === points.length - 1
                      ? 'Dziś'
                      : dateFormat.format(point.at)}
                </td>
                <td>{point.balance.toLocaleString('pl-PL')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  )
}
