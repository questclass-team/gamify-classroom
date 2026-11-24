import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const media = window.matchMedia(QUERY)
  media.addEventListener('change', onChange)
  return () => media.removeEventListener('change', onChange)
}

/** True when the visitor asked for less motion; live, so toggling the OS setting applies at once. */
export function useReducedMotion() {
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(QUERY).matches,
    () => false,
  )
}

/** Non-hook check for code that runs outside React (timelines, renderers). */
export function prefersReducedMotion() {
  return window.matchMedia(QUERY).matches
}
