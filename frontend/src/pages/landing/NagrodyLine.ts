import { useSyncExternalStore } from 'react'
import { gsap } from '../../lib/gsap'

/** Live media query. */
export function useMediaQuery(query: string) {
  return useSyncExternalStore(
    (onChange) => {
      const media = window.matchMedia(query)
      media.addEventListener('change', onChange)
      return () => media.removeEventListener('change', onChange)
    },
    () => window.matchMedia(query).matches,
    () => false,
  )
}

export function setLit(step: Element, lit: boolean) {
  const value = String(lit)
  for (const element of step.querySelectorAll('[data-node], [data-card]')) {
    if (element.getAttribute('data-lit') !== value) element.setAttribute('data-lit', value)
  }
}

/**
 * The reveal grammar: a line of light drawn by scroll, each node (with its card) lighting
 * the moment the light reaches it. Markup inside `container`: `[data-line="y"]` holding a
 * `[data-line-fill]`, and `[data-step]` items each with a `[data-node]` and a `[data-card]`.
 *
 * Call inside a reduced-motion-aware `gsap.matchMedia()` block and return its result: the
 * default markup is fully lit, and the returned cleanup lights everything again.
 */
export function revealAlongLine(container: HTMLElement | null) {
  const track = container?.querySelector<HTMLElement>('[data-line="y"]')
  const fill = track?.querySelector<HTMLElement>('[data-line-fill]')
  if (!container || !track || !fill) return
  const steps = [...container.querySelectorAll<HTMLElement>('[data-step]')]
  let fractions: number[] = []

  const measure = () => {
    const box = track.getBoundingClientRect()
    fractions = steps.map((step) => {
      const node = (step.querySelector('[data-node]') ?? step).getBoundingClientRect()
      return (node.top + node.height / 2 - box.top) / Math.max(1, box.height)
    })
  }
  const paint = (progress: number) => {
    steps.forEach((step, index) => {
      setLit(step, progress >= Math.min(0.985, fractions[index] ?? 0) - 0.002)
    })
  }

  measure()
  steps.forEach((step) => setLit(step, false))
  gsap.fromTo(
    fill,
    { scaleY: 0 },
    {
      scaleY: 1,
      ease: 'none',
      scrollTrigger: {
        trigger: track,
        start: 'top 68%',
        end: 'bottom 68%',
        scrub: 0.5,
        onRefresh: measure,
      },
      onUpdate() {
        paint(this.progress())
      },
    },
  )
  return () => steps.forEach((step) => setLit(step, true))
}
