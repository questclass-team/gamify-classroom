import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { ACTIVITIES, STUDENT, UNIT } from './content'
import { gsap, ScrollTrigger, useGSAP } from '../../lib/gsap'
import { glowPulse, type SkyDrive } from './skyState'
import type { ZlotoArch } from './ZlotoArch'
import { ZlotoArchCanvas } from './ZlotoArchCanvas'
import { ZlotoGuilloche } from './ZlotoEngraving'

const EARNED = ACTIVITIES.reduce((sum, item) => sum + item.points, 0)
/** The balance the four rewards bring the example student to. */
const BALANCE = STUDENT.points
const BEFORE = BALANCE - EARNED
/** Progress windows (0–1 of the pinned coin) in which each reward lands. */
const WINDOWS = ACTIVITIES.map((_, index) => [0.04 + index * 0.2, 0.2 + index * 0.2] as const)

const mix = (a: number, b: number, t: number) => a + (b - a) * t
const clamp01 = (t: number) => Math.min(1, Math.max(0, t))
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2)
const easeOut = (t: number) => 1 - (1 - t) ** 3

/** Balance at coin progress q, and how many rewards have fully landed. */
function balanceAt(q: number) {
  let points = BEFORE
  let landed = 0
  ACTIVITIES.forEach((item, index) => {
    const [a, b] = WINDOWS[index]!
    const local = clamp01((q - a) / (b - a))
    points += item.points * easeOut(local)
    if (local >= 1) landed++
  })
  return { points, landed }
}

/** The coin's ring as hairlines of light, for when there is no WebGL. */
function StaticRim() {
  return (
    <svg viewBox="-100 -100 200 200" className="absolute inset-0 size-full" aria-hidden="true">
      {Array.from({ length: 11 }, (_, i) => {
        const r = 72 + i * 2.7
        const segment = (2 * Math.PI * r) / 64
        return (
          <circle
            key={i}
            r={r}
            fill="none"
            stroke={['#8e9bff', '#fbfaff', '#6c3bf4', '#8e9bff'][i % 4]}
            strokeOpacity={0.35 + (i % 4) * 0.12}
            strokeWidth="1.3"
            strokeDasharray={`${segment * 0.72} ${segment * 0.28}`}
            transform={`rotate(${i * 7})`}
          />
        )
      })}
    </svg>
  )
}

interface LandingZlotoProps {
  live: boolean
  /** WebGL is available (else the coin's ring is drawn as hairlines). */
  webgl: boolean
  drive: RefObject<SkyDrive>
}

/**
 * Punkty: a big arch of glowing tiles rises under the title, its ends melting
 * into bokeh, and closes into the coin as the chapter scrolls on; while the coin holds, the four
 * rewards land and the balance climbs to the demo account's. The three.js renderer exists only
 * while the chapter is near the viewport. Reduced motion: the closed coin as one still frame.
 */
export function LandingPunkty({ live, webgl, drive }: LandingZlotoProps) {
  const root = useRef<HTMLElement>(null)
  const canvasBox = useRef<HTMLDivElement>(null)
  const apex = useRef<HTMLDivElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const coinBox = useRef<HTMLDivElement>(null)
  const face = useRef<HTMLDivElement>(null)
  const amount = useRef<HTMLSpanElement>(null)
  const archRef = useRef<ZlotoArch | null>(null)
  /** Scroll-driven targets and their eased values (read per frame). */
  const target = useRef({ assemble: 1, morph: 1 })
  const eased = useRef({ assemble: 1, morph: 1 })
  const landed = useRef(ACTIVITIES.length)
  const [near, setNear] = useState(false)

  // Mount the renderer only around this chapter: the page never holds more than two contexts.
  useEffect(() => {
    const element = root.current
    if (!element || !webgl) return
    const observer = new IntersectionObserver(
      ([entry]) => setNear(entry?.isIntersecting ?? false),
      { rootMargin: '80% 0px 80% 0px' },
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [webgl])

  const paint = useCallback(
    (q: number) => {
      const state = balanceAt(q)
      if (amount.current) amount.current.textContent = String(Math.round(state.points))
      root.current?.querySelectorAll<HTMLElement>('[data-zloto-row]').forEach((row, index) => {
        const on = String(index < state.landed)
        if (row.dataset.on !== on) row.dataset.on = on
      })
      // Each reward that lands answers with a soft glow of the coin; the full one, of the sky too.
      if (state.landed > landed.current) {
        const full = state.landed === ACTIVITIES.length
        if (archRef.current) glowPulse(archRef.current, full ? 0.9 : 0.4)
        if (full) glowPulse(drive.current, 0.7)
      }
      landed.current = state.landed
    },
    [drive],
  )

  const onFrame = useCallback(
    (arch: ZlotoArch, dt: number) => {
      const host = canvasBox.current?.getBoundingClientRect()
      const coin = coinBox.current?.getBoundingClientRect()
      if (!host || !coin) return
      const { width } = arch.size
      const k = dt === 0 ? 1 : 1 - Math.pow(0.0004, dt)
      const value = eased.current
      value.assemble += (target.current.assemble - value.assemble) * k
      value.morph += (target.current.morph - value.morph) * k
      arch.assemble = value.assemble

      const s = arch.state
      s.ringProgress = 1
      s.intensity = 1
      const coinX = coin.left - host.left + coin.width / 2
      const coinY = coin.top - host.top + coin.height / 2
      const m = live ? easeInOut(clamp01(value.morph)) : 1
      if (m >= 0.9999) {
        s.cx = coinX
        s.cy = coinY
        s.radius = coin.width / 2
        s.arc = 1
        s.spin = -Math.PI * 0.5
        s.lean = 0
        return
      }
      // The hero arch: big, its apex under the title, both legs running out of the frame.
      const narrow = width < 768
      const heroRadius = narrow
        ? Math.max(width * 0.62, 220)
        : Math.min(Math.max(width * 0.46, 420), 820)
      const mark = apex.current?.getBoundingClientRect()
      // It rises with the title, then holds in the frame while the title scrolls away.
      const apexY = Math.max(mark ? mark.top - host.top : 0, host.height * (narrow ? 0.4 : 0.34))
      s.cx = mix(width / 2, coinX, m)
      s.cy = mix(apexY + heroRadius, coinY, m)
      s.radius = mix(heroRadius, coin.width / 2, m)
      s.arc = 0.5 + 0.5 * m
      s.spin = -m * Math.PI * 0.5
      s.lean = -0.12 * (1 - m)
    },
    [live],
  )

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(
        {
          wide: '(min-width: 1024px)',
          motion: '(prefers-reduced-motion: no-preference)',
        },
        (context) => {
          const { wide, motion } = context.conditions!
          if (!motion || !live) return
          const section = root.current!
          const coin = coinBox.current!
          const goal = target.current
          goal.assemble = 0
          goal.morph = 0
          landed.current = 0
          paint(0)

          // The sparks fly into their bricks as the chapter rises into view.
          ScrollTrigger.create({
            trigger: section,
            start: 'top bottom',
            end: 'top 15%',
            onUpdate: (self) => {
              goal.assemble = self.progress
            },
          })
          // The arch closes into the coin as the coin's stage arrives.
          ScrollTrigger.create({
            trigger: wide ? pin.current : coin,
            start: 'top bottom',
            end: wide ? 'top top' : 'top 25%',
            onUpdate: (self) => {
              goal.morph = self.progress
            },
          })
          gsap.fromTo(
            face.current,
            { opacity: 0, scale: 0.92 },
            {
              opacity: 1,
              scale: 1,
              ease: 'none',
              scrollTrigger: {
                trigger: wide ? pin.current : coin,
                start: wide ? 'top 25%' : 'top 45%',
                end: wide ? 'top top' : 'top 25%',
                scrub: true,
              },
            },
          )
          // While the coin holds, the four rewards land and the balance climbs.
          const proxy = { q: 0 }
          gsap.to(proxy, {
            q: 1,
            ease: 'none',
            onUpdate: () => paint(proxy.q),
            scrollTrigger: wide
              ? { trigger: pin.current, start: 'top top', end: 'bottom bottom', scrub: 1 }
              : { trigger: coin, start: 'top 55%', end: 'bottom 5%', scrub: 1 },
          })
          return () => {
            goal.assemble = 1
            goal.morph = 1
            landed.current = ACTIVITIES.length
            paint(1)
          }
        },
      )
      return () => mm.revert()
    },
    { scope: root, dependencies: [live, paint], revertOnUpdate: true },
  )

  const canvas = near && webgl && (
    <ZlotoArchCanvas
      archRef={archRef}
      count={[9000, 4000]}
      slotsPerUnit={72}
      onFrame={onFrame}
      className="size-full"
    />
  )

  return (
    <section
      ref={root}
      id="punkty"
      aria-labelledby="blask-punkty-title"
      data-live={live}
      className="blask-zl"
    >
      {live && (
        <div ref={canvasBox} className="blask-zl-canvas">
          {canvas}
        </div>
      )}

      <div className="blask-zl-approach">
        <div className="blask-zl-intro">
          <h2
            id="blask-punkty-title"
            data-mask-title
            className="blask-display blask-h2 text-blask-pearl"
          >
            Punkty od razu na koncie
          </h2>
          <p className="mx-auto mt-6 max-w-[46ch] text-[1.0625rem] leading-relaxed text-blask-moon sm:text-lg">
            Prowadzący przyznaje nagrodę, a punkty trafiają na Twoje konto z wpisem w historii: kto,
            kiedy, ile i za co.
          </p>
        </div>
        {live && <div ref={apex} aria-hidden="true" className="blask-zl-apex" />}
      </div>

      <div ref={pin} className="blask-zl-pin">
        <div className="blask-zl-stage">
          <div className="blask-zl-coin-col">
            <div ref={coinBox} className="blask-zl-coin">
              {!live && (
                <div ref={canvasBox} className="blask-zl-coin-canvas">
                  {canvas}
                </div>
              )}
              {!webgl && <StaticRim />}
              <div ref={face} className="blask-zl-face">
                <ZlotoGuilloche
                  className="blask-zl-engraving"
                  outer={98}
                  inner={60}
                  lobes={20}
                  strands={14}
                />
                <p className="blask-zl-balance" aria-hidden="true">
                  <span className="blask-zl-figure blask-num">
                    <span ref={amount}>{BALANCE}</span>
                    <span className="blask-zl-g"> {UNIT}</span>
                  </span>
                  <span className="blask-zl-caption">na koncie</span>
                </p>
              </div>
            </div>
          </div>

          <div className="blask-zl-copy">
            <ul aria-label="Typowe nagrody" className="grid gap-1">
              {ACTIVITIES.map((item) => (
                <li
                  key={item.id}
                  data-zloto-row
                  data-on="true"
                  className="blask-zl-row flex items-baseline justify-between gap-6 py-3.5"
                >
                  <span className="text-[1.0625rem]">{item.label}</span>
                  <span className="blask-display blask-num shrink-0 text-[1.625rem] leading-none text-blask-pearl">
                    +{item.points}
                    <span className="text-blask-lavender"> {UNIT}</span>
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-6 text-[1.0625rem] leading-relaxed text-blask-moon">
              Było{' '}
              <span className="blask-num text-blask-pearl">
                {BEFORE} {UNIT}
              </span>
              , cztery nagrody dodają{' '}
              <span className="blask-num text-blask-pearl">
                {EARNED} {UNIT}
              </span>
              . Na koncie jest{' '}
              <span className="blask-num text-blask-pearl">
                {BALANCE} {UNIT}
              </span>
              .
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}
