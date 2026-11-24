import { useEffect, useRef, type RefObject } from 'react'
import { useReducedMotion } from '../../lib/useReducedMotion'
import type { ArchOptions, ZlotoArch } from './ZlotoArch'

/** The arch's bloom: the glow and the softness are the point. */
const BLOOM: ArchOptions['bloom'] = { strength: 0.55, radius: 0.35, threshold: 0.22 }

interface ZlotoArchCanvasProps {
  /** Receives the live arch (null after unmount) so GSAP can drive `state`, `assemble`, `flare`. */
  archRef: RefObject<ZlotoArch | null>
  /** Particles on desktop / under 768 px. */
  count: readonly [number, number]
  slotsPerUnit: number
  maxDpr?: number
  /** Writes `arch.state` before every frame (and before each still frame). */
  onFrame?: ArchOptions['onFrame']
  className?: string
}

/**
 * Hosts one ZlotoArch renderer; recreated when the reduced-motion preference flips. three.js loads
 * with the first renderer (its own chunk), so the landing's first paint never waits for it.
 */
export function ZlotoArchCanvas({
  archRef,
  count,
  slotsPerUnit,
  maxDpr = 1.5,
  onFrame,
  className,
}: ZlotoArchCanvasProps) {
  const hostRef = useRef<HTMLDivElement>(null)
  const still = useReducedMotion()
  const onFrameRef = useRef(onFrame)
  const [desktop, mobile] = count

  useEffect(() => {
    onFrameRef.current = onFrame
  }, [onFrame])

  useEffect(() => {
    const host = hostRef.current
    if (!host) return
    const narrow = window.innerWidth < 768
    let arch: ZlotoArch | null = null
    let cancelled = false
    void import('./ZlotoArch').then(({ ZlotoArch: Arch }) => {
      if (cancelled) return
      try {
        arch = new Arch(host, {
          count: narrow ? mobile : desktop,
          slotsPerUnit: narrow ? Math.round(slotsPerUnit * 0.7) : slotsPerUnit,
          maxDpr,
          bloom: BLOOM,
          interactive: true,
          still,
          onFrame: (instance, dt) => onFrameRef.current?.(instance, dt),
        })
      } catch {
        // No WebGL: the section's hairline rim stays as the fallback.
        return
      }
      archRef.current = arch
      arch.start()
    })
    return () => {
      cancelled = true
      if (!arch) return
      archRef.current = null
      arch.dispose()
    }
  }, [archRef, desktop, mobile, slotsPerUnit, maxDpr, still])

  return <div ref={hostRef} aria-hidden="true" className={className} />
}
