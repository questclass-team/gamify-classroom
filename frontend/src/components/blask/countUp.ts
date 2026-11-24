import { useEffect, useRef, useState, useSyncExternalStore } from 'react'

/** Blask's motion curve: fast start, long soft landing. */
export function easeOutExpo(t: number): number {
  return t >= 1 ? 1 : 1 - 2 ** (-10 * t)
}

/** The shown number `elapsed` ms into a count from `from` to `to` lasting `duration` ms. */
export function countValue(from: number, to: number, elapsed: number, duration: number): number {
  const t = duration <= 0 ? 1 : Math.min(1, Math.max(0, elapsed / duration))
  return Math.round(from + (to - from) * easeOutExpo(t))
}

const REDUCED_MOTION = '(prefers-reduced-motion: reduce)'

function subscribeMotion(listener: () => void) {
  const query = window.matchMedia(REDUCED_MOTION)
  query.addEventListener('change', listener)
  return () => query.removeEventListener('change', listener)
}

function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  )
}

/**
 * A number that counts up from 0 to `target` (and on to each new target) with the expo curve.
 * Under reduced motion it is the target at once. Decorative: give screen readers the final value.
 */
export function useCountUp(target: number, duration = 1100): number {
  const reduce = usePrefersReducedMotion()
  const [value, setValue] = useState(0)
  const shown = useRef(0)

  useEffect(() => {
    if (reduce) return
    const from = shown.current
    let frame = 0
    let start: number | null = null
    const step = (now: number) => {
      start ??= now
      const next = countValue(from, target, now - start, duration)
      shown.current = next
      setValue(next)
      if (next !== target) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration, reduce])

  return reduce ? target : value
}
