import { useEffect, useRef, type RefObject } from 'react'
import { flushSync } from 'react-dom'
import { setTheme, useTheme, type Theme } from '../../lib/theme'
import { prefersReducedMotion } from '../../lib/useReducedMotion'

interface ThemeSwitchProps {
  className?: string
}

interface Cell {
  x: number
  y: number
  /** 1 for a lit pixel, lower for the dimmed checker pixels of the moon's shadow side. */
  a: number
}

/** The sun on a 9 × 9 grid: a round core and eight short rays. */
const SUN: Cell[] = [
  '....#....',
  '.#.....#.',
  '...###...',
  '..#####..',
  '#.#####.#',
  '..#####..',
  '...###...',
  '.#.....#.',
  '....#....',
].flatMap((row, y) => [...row].flatMap((c, x) => (c === '#' ? [{ x, y, a: 1 }] : [])))

/** The moon: a crescent (its shadow side in a dimmed checker) and a small star. */
const MOON: Cell[] = (() => {
  const cells: Cell[] = []
  for (let y = 0; y < 9; y++)
    for (let x = 0; x < 9; x++) {
      const inDisk = (x - 3.8) ** 2 + (y - 4.6) ** 2 <= 3.75 ** 2
      const inCut = (x - 5.7) ** 2 + (y - 3.1) ** 2 <= 3.05 ** 2
      if (inDisk && !inCut) cells.push({ x, y, a: 1 })
      else if (inDisk && (x + y) % 2 === 0) cells.push({ x, y, a: 0.3 })
    }
  const star = [
    { x: 7, y: 1, a: 1 },
    { x: 7, y: 0, a: 0.45 },
    { x: 6, y: 1, a: 0.45 },
    { x: 8, y: 1, a: 0.45 },
    { x: 7, y: 2, a: 0.45 },
    { x: 8, y: 4, a: 0.6 },
  ]
  for (const s of star) if (!cells.some((c) => c.x === s.x && c.y === s.y)) cells.push(s)
  return cells
})()

const KNOB = 28
const PITCH = 2
const ORIGIN = (KNOB - 9 * PITCH) / 2
const DURATION = 720
/** Sun pixels: cobalt-deep on the white knob; moon pixels: pearl with a lavender glow. */
const INK: Record<Theme, string> = { light: '29, 41, 214', dark: '251, 250, 255' }

function easeOut(t: number) {
  return 1 - (1 - t) ** 3
}

function easeInOut(t: number) {
  return t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2
}

/**
 * Draws the knob's pixel icon. At rest the cells snap to device pixels (crisp at DPR 1 and 2);
 * during a toggle the old icon's pixels scatter as particles and reassemble into the new icon.
 */
function useKnobIcon(canvasRef: RefObject<HTMLCanvasElement | null>, theme: Theme) {
  const previous = useRef<Theme | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!canvas || !ctx) return
    const dpr = Math.min(window.devicePixelRatio || 1, 3)
    canvas.width = Math.round(KNOB * dpr)
    canvas.height = Math.round(KNOB * dpr)
    const cellPx = Math.max(1, Math.round(PITCH * dpr * 0.75)) / dpr
    const glow = (dark: boolean, alpha: number) => {
      ctx.shadowColor = dark ? `rgba(142, 155, 255, ${0.9 * alpha})` : 'transparent'
      ctx.shadowBlur = dark ? 3 * dpr : 0
    }

    const drawStatic = (which: Theme) => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, KNOB, KNOB)
      glow(which === 'dark', 1)
      for (const c of which === 'dark' ? MOON : SUN) {
        ctx.fillStyle = `rgba(${INK[which]}, ${c.a})`
        const x = Math.round((ORIGIN + c.x * PITCH) * dpr) / dpr
        const y = Math.round((ORIGIN + c.y * PITCH) * dpr) / dpr
        ctx.fillRect(x, y, cellPx, cellPx)
      }
    }

    const from = previous.current
    previous.current = theme
    if (from === null || from === theme || prefersReducedMotion()) {
      drawStatic(theme)
      return
    }

    // Particles: each old pixel flies to a scattered point, then on to a pixel of the new icon.
    const source = from === 'dark' ? MOON : SUN
    const target = theme === 'dark' ? MOON : SUN
    const count = Math.max(source.length, target.length)
    const travel = theme === 'dark' ? -1 : 1
    const particles = Array.from({ length: count }, (_, i) => {
      const a = source[i]
      const b = target[i]
      const angle = Math.random() * Math.PI * 2
      const radius = 3 + Math.random() * 8
      return {
        ax: a ? ORIGIN + a.x * PITCH : KNOB / 2,
        ay: a ? ORIGIN + a.y * PITCH : KNOB / 2,
        aa: a?.a ?? 0,
        sx: KNOB / 2 + Math.cos(angle) * radius + travel * 3,
        sy: KNOB / 2 + Math.sin(angle) * radius,
        bx: b ? ORIGIN + b.x * PITCH : KNOB / 2,
        by: b ? ORIGIN + b.y * PITCH : KNOB / 2,
        ba: b?.a ?? 0,
        delay: Math.random() * 0.12,
      }
    })

    let frame = 0
    const start = performance.now()
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / DURATION)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      ctx.clearRect(0, 0, KNOB, KNOB)
      for (const p of particles) {
        const local = Math.min(1, Math.max(0, (t - p.delay) / (1 - p.delay)))
        let x: number
        let y: number
        let alpha: number
        let rgb: string
        let size: number
        if (local < 0.45) {
          const k = easeOut(local / 0.45)
          x = p.ax + (p.sx - p.ax) * k
          y = p.ay + (p.sy - p.ay) * k
          alpha = p.aa * (1 - 0.35 * k) + (p.aa === 0 ? 0.5 * k * p.ba : 0)
          rgb = INK[from]
          size = cellPx * (1 - 0.3 * k)
          glow(from === 'dark', alpha)
        } else {
          const k = easeInOut((local - 0.45) / 0.55)
          x = p.sx + (p.bx - p.sx) * k
          y = p.sy + (p.by - p.sy) * k
          alpha = p.ba === 0 ? 0.65 * p.aa * (1 - k) : 0.5 + (p.ba - 0.5) * k
          rgb = INK[theme]
          size = cellPx * (0.7 + 0.3 * k)
          glow(theme === 'dark', alpha)
        }
        if (alpha <= 0.01) continue
        ctx.fillStyle = `rgba(${rgb}, ${alpha})`
        ctx.fillRect(x, y, size, size)
      }
      if (t < 1) frame = requestAnimationFrame(tick)
      else drawStatic(theme)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [canvasRef, theme])
}

/**
 * Switches the whole app between light and dark. With the View Transitions API the new mode
 * is revealed as a circle growing from the switch; otherwise the colours cross-fade. Reduced
 * motion swaps at once.
 */
function changeTheme(next: Theme, origin: HTMLElement) {
  const root = document.documentElement
  if (prefersReducedMotion()) {
    setTheme(next)
    return
  }
  if (typeof document.startViewTransition !== 'function') {
    root.classList.add('blask-theme-fade')
    setTheme(next)
    window.setTimeout(() => root.classList.remove('blask-theme-fade'), 450)
    return
  }
  const box = origin.getBoundingClientRect()
  const x = box.left + box.width / 2
  const y = box.top + box.height / 2
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y))
  root.classList.add('blask-vt')
  const transition = document.startViewTransition(() => {
    flushSync(() => setTheme(next))
  })
  transition.ready
    .then(() => {
      root.animate(
        { clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${radius}px at ${x}px ${y}px)`] },
        {
          duration: 700,
          easing: 'cubic-bezier(0.16, 1, 0.3, 1)',
          pseudoElement: '::view-transition-new(root)',
        },
      )
    })
    .catch(() => {})
  transition.finished.finally(() => root.classList.remove('blask-vt')).catch(() => {})
}

/**
 * The animated light / dark switch: a recessed pill track, a glossy squircle knob with a pixel
 * sun or moon, a glow edge that sweeps round the knob as it slides and an ambient pool of light
 * that follows it. Header size (64 × 36). Shared by the landing and the app shell; it is a
 * labelled switch (role="switch", aria-checked), so put no extra label next to it.
 */
export function ThemeSwitch({ className = '' }: ThemeSwitchProps) {
  const [theme] = useTheme()
  const dark = theme === 'dark'
  const canvasRef = useRef<HTMLCanvasElement>(null)
  useKnobIcon(canvasRef, theme)

  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      aria-label="Tryb ciemny"
      data-dark={dark}
      onClick={(event) => changeTheme(dark ? 'light' : 'dark', event.currentTarget)}
      className={`blask-switch ${className}`}
    >
      <span aria-hidden="true" className="blask-switch__pool" />
      <span aria-hidden="true" className="blask-switch__track">
        <span className="blask-switch__slot">
          <span className="blask-switch__edge blask-switch__edge--glow" />
          <span className="blask-switch__edge" />
          <span className="blask-switch__knob">
            <canvas ref={canvasRef} className="blask-switch__icon" />
          </span>
        </span>
      </span>
    </button>
  )
}
