import { gsap } from '../../lib/gsap'

/**
 * The reveal grammar on Blask's line: a line of light is filled by scroll and every node
 * on it ignites (with its card) as the light reaches it.
 *
 * Markup inside `container`: a track holding a `[data-blask-fill]` (`[data-line]` for the vertical
 * line, `[data-line="x"]` for the horizontal one), and `[data-step]` items, each with a
 * `[data-node]` and optionally a `[data-card]`. Call inside a reduced-motion aware
 * `gsap.matchMedia()` block and return its result: the default markup is fully lit and the
 * cleanup lights everything again.
 */
export function revealAlongLine(
  container: HTMLElement | null,
  {
    axis = 'y',
    start = 'top 62%',
    end = 'bottom 62%',
    onStep,
  }: {
    axis?: 'x' | 'y'
    start?: string
    end?: string
    onStep?: (index: number) => void
  } = {},
) {
  const track = container?.querySelector<HTMLElement>(
    axis === 'x' ? '[data-line="x"]' : '[data-line]:not([data-line="x"])',
  )
  const fill = track?.querySelector<HTMLElement>('[data-blask-fill]')
  if (!container || !track || !fill) return
  const steps = [...container.querySelectorAll<HTMLElement>('[data-step]')]
  let fractions: number[] = []
  let reached = -1

  const measure = () => {
    const box = track.getBoundingClientRect()
    fractions = steps.map((step) => {
      const node = (step.querySelector('[data-node]') ?? step).getBoundingClientRect()
      return axis === 'x'
        ? (node.left + node.width / 2 - box.left) / Math.max(1, box.width)
        : (node.top + node.height / 2 - box.top) / Math.max(1, box.height)
    })
  }

  measure()
  steps.forEach((step) => setLit(step, false))
  gsap.fromTo(fill, axis === 'x' ? { scaleX: 0 } : { scaleY: 0 }, {
    ...(axis === 'x' ? { scaleX: 1 } : { scaleY: 1 }),
    ease: 'none',
    scrollTrigger: { trigger: track, start, end, scrub: 1, onRefresh: measure },
    onUpdate() {
      const progress = this.progress()
      let last = -1
      steps.forEach((step, index) => {
        // A node at (or past) the end of the line ignites as the light arrives there.
        const lit = progress >= Math.min(0.985, fractions[index] ?? 0) - 0.002
        setLit(step, lit)
        if (lit) last = index
      })
      if (last > reached) onStep?.(last)
      reached = last
    },
  })
  return () => steps.forEach((step) => setLit(step, true))
}

export function setLit(step: Element, lit: boolean) {
  const value = String(lit)
  for (const element of step.querySelectorAll('[data-node], [data-card]')) {
    if (element.getAttribute('data-lit') !== value) element.setAttribute('data-lit', value)
  }
}
