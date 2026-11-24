import type Lenis from 'lenis'
import { useCallback, useSyncExternalStore } from 'react'

/* The page's smooth-scroll instance as a tiny external store: one page is mounted at a time. */
let current: Lenis | null = null
const listeners = new Set<() => void>()

export function publishLenis(instance: Lenis | null) {
  current = instance
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** The page's Lenis instance, or null when scrolling natively (reduced motion). */
export function useLenis() {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null,
  )
}

/** Scrolls to an element or selector, eased when Lenis runs, instant otherwise. */
export function useScrollTo() {
  const lenis = useLenis()
  return useCallback(
    (target: string | HTMLElement, offset = 0) => {
      if (lenis) {
        lenis.scrollTo(target, { offset })
        return
      }
      const element = typeof target === 'string' ? document.querySelector(target) : target
      if (!(element instanceof HTMLElement)) return
      window.scrollTo({ top: element.getBoundingClientRect().top + window.scrollY + offset })
    },
    [lenis],
  )
}
