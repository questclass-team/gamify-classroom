import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { FinaleCanvas, type FinaleUniforms } from './FinaleCanvas'
import type { FinaleDrive } from './FinaleState'
import { finaleFragment } from './FinaleShader'

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Smoothstep of x between a and b. */
const band = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

interface Scene {
  start: HTMLElement
  end: HTMLElement
  helix: HTMLElement | null
  horizon: HTMLElement | null
}

interface FinaleSkyProps {
  /** The page root: the finale reads its markers (`data-finale-*`) from it. */
  rootRef: RefObject<HTMLElement | null>
  /** Motion and WebGL: the canvas is sticky and scroll-driven; otherwise one still frame. */
  live: boolean
  webgl: boolean
  drive: RefObject<FinaleDrive>
  className?: string
}

/**
 * The night under the end of the page: one canvas behind the closing (`data-finale-start`, the
 * helix around `data-finale-helix`) and the footer (`data-finale-end`, the horizon on
 * `data-finale-horizon`, the key word `data-finale-word`). Its host spans exactly those two, so
 * the DOM keeps main and footer apart; the canvas is sticky inside it while live (a still frame of
 * the whole stretch otherwise) and exists only while the end of the page is near.
 */
export function FinaleSky({ rootRef, live, webgl, drive, className = '' }: FinaleSkyProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const wordRef = useRef<HTMLElement | null>(null)
  const scene = useRef<Scene | null>(null)
  const last = useRef(0)
  const eased = useRef({ p: live ? 0 : 1, phase: 0 })
  const [near, setNear] = useState(false)

  // The host covers the closing and the footer, wherever the rest of the page puts them.
  useEffect(() => {
    const root = rootRef.current
    const host = hostRef.current
    const start = root?.querySelector<HTMLElement>('[data-finale-start]')
    const end = root?.querySelector<HTMLElement>('[data-finale-end]')
    if (!root || !host || !start || !end) return
    scene.current = {
      start,
      end,
      helix: root.querySelector('[data-finale-helix]'),
      horizon: root.querySelector('[data-finale-horizon]'),
    }
    wordRef.current = root.querySelector('[data-finale-word]')
    const place = () => {
      const origin = root.getBoundingClientRect().top
      const top = Math.floor(start.getBoundingClientRect().top - origin)
      const bottom = Math.ceil(end.getBoundingClientRect().bottom - origin)
      host.style.top = `${top}px`
      host.style.height = `${bottom - top}px`
    }
    place()
    const observer = new ResizeObserver(place)
    observer.observe(root)
    observer.observe(start)
    observer.observe(end)
    return () => {
      observer.disconnect()
      scene.current = null
    }
  }, [rootRef])

  useEffect(() => {
    const host = hostRef.current
    if (!host || !webgl) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry?.isIntersecting ?? false),
      { rootMargin: '50% 0px 50% 0px' },
    )
    observer.observe(host)
    return () => observer.disconnect()
  }, [webgl])

  const onFrame = useCallback(
    (u: FinaleUniforms, time: number, box: DOMRect) => {
      const els = scene.current
      if (!els) return
      const d = drive.current
      const vw = window.innerWidth
      const vh = window.innerHeight
      const ref = Math.max(1, Math.min(vh, vw * 0.75))
      const Y = (y: number) => (box.bottom - y) / ref
      const dt = last.current === 0 ? 0 : Math.max(0, Math.min(0.1, time - last.current))
      last.current = time
      const e = eased.current

      // The horizon is scrubbed by how far the footer has come up (1 at the end of the page),
      // eased so a flick of the wheel still rises smoothly.
      const footer = els.end.getBoundingClientRect()
      const target = live ? clamp01(1 - (footer.bottom - vh) / (0.75 * vh)) : 1
      e.p += (target - e.p) * (1 - Math.pow(0.04, dt))
      e.phase += dt * (0.6 + d.boost)

      const helix = (els.helix ?? els.start).getBoundingClientRect()
      const line = (els.horizon ?? els.end).getBoundingClientRect()
      u.uRef = ref
      u.uWidth = box.width / ref
      u.uPhase = live ? e.phase : 6
      u.uHelix = [
        Y(helix.top + helix.height / 2),
        d.pour,
        d.flare,
        Y(els.start.getBoundingClientRect().top),
      ]
      u.uHorizon = [Y(line.top), band(0, 0.7, e.p), band(0.4, 1, e.p), Y(footer.top)]
      u.uWordLit = band(0.62, 1, e.p)
      u.uView = [box.top, vh, live ? 1 : 0]
      u.uDetail = vw < 768 ? 0 : 1
    },
    [drive, live],
  )

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-x-0 z-0 bg-blask-night ${className}`}
    >
      {near && webgl && (
        <FinaleCanvas
          fragment={finaleFragment}
          word={wordRef}
          still={!live}
          onFrame={onFrame}
          className={live ? 'sticky top-0 h-[100lvh] w-full' : 'absolute inset-0'}
        />
      )}
    </div>
  )
}
