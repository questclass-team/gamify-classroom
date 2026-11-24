import { useCallback, useEffect, useLayoutEffect, useRef, type RefObject } from 'react'
import { gsap } from '../../lib/gsap'
import { ShaderCanvas, type Uniforms } from '../../lib/ShaderCanvas'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import type { BlindsDrive } from './NocState'
import { skyFragment } from './skyShader'
import type { SkyDrive } from './skyState'

/** An off-screen gradient stretch: both edges far below the frame (no dusk). */
const NOWHERE = [-50, -51]

function skyUniforms(dark: boolean): Uniforms {
  return {
    uNight: dark ? 1 : 0,
    uPhase: 0,
    uReveal: 1,
    uThickness: 1,
    uThin: 1,
    uOffsetY: 0.32,
    uReflection: 0.8,
    uPointer: 0,
    uCalm: [0, 0, 0, 0],
    uRibbon: 1,
    uThread: 0.85,
    uThreadDraw: 1,
    uAlong: 1,
    uStand: 0,
    uBeamX: 0.5,
    uPivotX: 0.5,
    uGlint: 1,
    uDusk: NOWHERE,
    uIgnite: 0,
    uImpact: 0.12,
    uFlare: 0,
    uBeamLevel: 1,
    uDetail: 1,
    uGlow: 0,
    uHeadY: 0.4,
    uHead: 0,
    uBlinds: [0, 0, 0, 0],
  }
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
/** Smoothstep of x between a and b. */
const band = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}
const mix = (a: number, b: number, t: number) => a + (b - a) * t

interface Scene {
  anchors: HTMLElement[]
  calm: HTMLElement | null
  axis: HTMLElement | null
  ground: HTMLElement | null
  dusk: HTMLElement | null
  blinds: HTMLElement | null
  fills: HTMLElement[]
}

/** Height of the hero band in CSS pixels. */
const bandPx = (width: number) => (width < 768 ? 230 : Math.min(320, 170 + width * 0.1))

interface LandingSkyProps {
  /** The page root: the sky reads its markers (`data-sky-*`, `data-blask-fill`) from it. */
  rootRef: RefObject<HTMLElement | null>
  drive: RefObject<SkyDrive>
  /** Ranga's sweep and flare for the blinds. */
  blinds?: RefObject<BlindsDrive>
  /** Dark mode: the whole ground is night (no dusk), the ribbon glows on it. */
  dark: boolean
  className?: string
}

/**
 * The page's one full-screen shader. Sticky behind the scroll story (or a still backdrop of the
 * hero under reduced motion); ShaderCanvas pauses it whenever it is off screen.
 * Markers it reads: `data-sky-anchor` (the hero band), `data-sky-calm` (text over the glass),
 * `data-sky-axis` (the beam's x), `data-sky-ground` (where the beam lands), `data-sky-dusk` (the
 * long gradient stretch into the night), `data-sky-blinds` (the rank stage) and the line fills
 * (`data-blask-fill`, for the glow at the head of the line).
 */
export function LandingSky({ rootRef, drive, blinds, dark, className }: LandingSkyProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const uniforms = useRef<Uniforms>(skyUniforms(dark))
  const scene = useRef<Scene | null>(null)
  const last = useRef(0)
  const landed = useRef(false)
  const splash = useRef({ flare: 0 })
  const night = useRef(dark ? 1 : 0)

  // A mode switch eases the ground over ~0.4 s in the frame loop; inside the switch's circular
  // view transition (or with reduced motion) it lands at once, so the revealed page is final.
  useLayoutEffect(() => {
    night.current = dark ? 1 : 0
    if (document.documentElement.classList.contains('blask-vt') || prefersReducedMotion()) {
      uniforms.current.uNight = night.current
    }
  }, [dark])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return
    scene.current = {
      anchors: [...root.querySelectorAll<HTMLElement>('[data-sky-anchor]')],
      calm: root.querySelector('[data-sky-calm]'),
      axis: root.querySelector('[data-sky-axis]'),
      ground: root.querySelector('[data-sky-ground]'),
      dusk: root.querySelector('[data-sky-dusk]'),
      blinds: root.querySelector('[data-sky-blinds]'),
      fills: [...root.querySelectorAll<HTMLElement>('[data-blask-fill]')],
    }
    const flare = splash.current
    return () => {
      scene.current = null
      gsap.killTweensOf(flare)
    }
  }, [rootRef])

  const onFrame = useCallback(
    (time: number) => {
      const host = hostRef.current
      const els = scene.current
      const d = drive.current
      if (!host || !els) return
      const u = uniforms.current
      const box = host.getBoundingClientRect()
      const W = Math.max(1, box.width)
      const H = Math.max(1, box.height)
      const uvY = (y: number) => 1 - (y - box.top) / H

      const dt = last.current === 0 ? time : Math.max(0, Math.min(0.1, time - last.current))
      last.current = time
      u.uPhase = (u.uPhase as number) + dt * (0.7 + d.boost)
      u.uDetail = W < 768 ? 0 : 1
      const shade = u.uNight as number
      u.uNight = shade + (night.current - shade) * (1 - Math.pow(0.0004, dt))

      if (els.axis) {
        const axis = els.axis.getBoundingClientRect()
        u.uBeamX = (axis.left + axis.width / 2 - box.left) / W
      }

      // The ground: the dusk stretch scrolls with the page; past it, the night holds to the end.
      if (els.dusk) {
        const r = els.dusk.getBoundingClientRect()
        u.uDusk = [uvY(r.top), uvY(r.bottom)]
      } else {
        u.uDusk = NOWHERE
      }

      // Paper: the band sits on the hero's anchor and goes pale under the text.
      const anchor = els.anchors.find((el) => el.getClientRects().length > 0)
      let anchorY = 0.32
      if (anchor) {
        const a = anchor.getBoundingClientRect()
        anchorY = uvY(a.top + a.height / 2)
      }
      u.uThickness = bandPx(W) / (0.25 * H)
      if (els.calm) {
        const c = els.calm.getBoundingClientRect()
        u.uCalm = [(c.left - box.left) / W, uvY(c.bottom), (c.right - box.left) / W, uvY(c.top)]
      }

      // The beam: the band is drawn together, thins to a strand, stands up on the axis while the
      // dusk falls, and the beam reaches out of it both ways.
      const p = d.beam
      const gather = band(0.02, 0.42, p)
      // A band that has already scrolled away (tall phone heroes) is pulled back into view.
      const source = mix(anchorY, Math.min(anchorY, 0.8), band(0, 0.08, p))
      u.uOffsetY = mix(source, 0.56, gather)
      // It gathers at the middle of the screen and walks to the beam's axis while standing up.
      u.uPivotX = mix(0.5, u.uBeamX as number, band(0.34, 0.54, p))
      u.uAlong = mix(mix(1, 0.26, gather), 0.9, band(0.42, 0.66, p))
      u.uThin = mix(1, 0.1, band(0.06, 0.48, p))
      u.uStand = band(0.3, 0.6, p)
      u.uReflection = 0.8 * (1 - band(0, 0.22, p))
      u.uRibbon = 1 - band(0.5, 0.72, p)
      u.uThread = (0.85 + d.thread + 1.6 * band(0.2, 0.55, p)) * (1 - band(0.6, 0.74, p))
      u.uReveal = d.reveal
      u.uThreadDraw = d.threadDraw
      u.uPointer = d.pointer
      u.uGlint = d.glint * (1 - band(0.22, 0.42, p)) + d.thread * 0.6
      u.uIgnite = band(0.52, 0.72, p)
      // The landing: the splash, a flash that settles over a second and a half.
      if (p >= 0.71 && !landed.current) {
        landed.current = true
        gsap
          .timeline()
          .to(splash.current, { flare: 1.6, duration: 0.1, ease: 'power2.out', overwrite: true })
          .to(splash.current, { flare: 0, duration: 1.6, ease: 'expo.out' })
      } else if (p < 0.62) {
        landed.current = false
      }
      u.uFlare = splash.current.flare
      u.uGlow = d.flare

      // The ground the beam lands on scrolls away with the page; the scene dims as it goes.
      let impact = 3
      if (els.ground) {
        const g = els.ground.getBoundingClientRect()
        impact = Math.max(-2, Math.min(3, uvY(g.top + g.height / 2)))
      }
      u.uImpact = impact
      u.uBeamLevel = impact > 1.45 ? 0 : mix(1, 0.2, band(0.16, 1.0, impact))

      // The rank stage: where the blinds are painted.
      const sweep = blinds?.current
      if (els.blinds && sweep) {
        const r = els.blinds.getBoundingClientRect()
        u.uBlinds =
          r.bottom > box.top && r.top < box.bottom
            ? [uvY(r.bottom), uvY(r.top), sweep.sweep, sweep.pulse]
            : [0, 0, 0, 0]
      }

      // A soft glow rides the head of the line of light.
      let headY: number | null = null
      for (const fill of els.fills) {
        const scale = Number(gsap.getProperty(fill, 'scaleY'))
        if (scale <= 0.003 || scale >= 0.997) continue
        const tip = fill.getBoundingClientRect().bottom
        if (tip < box.top || tip > box.bottom) continue
        headY = uvY(tip)
        break
      }
      const k = 1 - Math.pow(0.004, dt)
      const head = u.uHead as number
      if (headY !== null) {
        u.uHeadY = headY
        u.uHead = head + (1 - head) * k
      } else {
        u.uHead = head * (1 - k)
      }
    },
    [drive, blinds],
  )

  return (
    <div ref={hostRef} aria-hidden="true" className={className}>
      <ShaderCanvas
        fragment={skyFragment}
        uniforms={uniforms}
        onFrame={onFrame}
        maxDpr={1.35}
        stillTime={7.5}
        className={`h-full w-full ${dark ? 'bg-blask-night' : 'bg-blask-paper'}`}
      />
    </div>
  )
}
