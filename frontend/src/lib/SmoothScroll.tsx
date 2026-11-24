import Lenis from 'lenis'
import 'lenis/dist/lenis.css'
import { useEffect, type ReactNode } from 'react'
import { gsap, ScrollTrigger } from './gsap'
import { publishLenis } from './lenis'
import { useReducedMotion } from './useReducedMotion'

/**
 * Wheel inside a modal dialog or an open account menu scrolls it natively, never the page behind.
 * Mark any other inner scroller with `data-lenis-prevent`.
 */
function preventSmoothScroll(node: HTMLElement) {
  return node.closest('dialog[open], [data-lenis-prevent]') !== null
}

/**
 * Smooth wheel scrolling (Lenis) driven by GSAP's ticker, so ScrollTrigger scrubs stay in sync
 * with the eased scroll. Off for reduced motion: the page then scrolls natively.
 * Mount one per page (the router's root layout does, keyed by page, as a sibling of the page); it
 * starts the page at the top. Read it with useLenis / useScrollTo.
 */
export function SmoothScroll({ children = null }: { children?: ReactNode }) {
  const reduceMotion = useReducedMotion()

  useEffect(() => {
    window.scrollTo(0, 0)
    if (reduceMotion) return
    const lenis = new Lenis({ lerp: 0.085, smoothWheel: true, prevent: preventSmoothScroll })
    lenis.on('scroll', ScrollTrigger.update)
    const tick = (time: number) => lenis.raf(time * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    publishLenis(lenis)
    return () => {
      publishLenis(null)
      gsap.ticker.remove(tick)
      gsap.ticker.lagSmoothing(500, 33)
      lenis.destroy()
    }
  }, [reduceMotion])

  // Web fonts change line breaks, and with them every trigger position.
  useEffect(() => {
    let alive = true
    void document.fonts?.ready.then(() => {
      if (alive) ScrollTrigger.refresh()
    })
    return () => {
      alive = false
    }
  }, [])

  return children
}
