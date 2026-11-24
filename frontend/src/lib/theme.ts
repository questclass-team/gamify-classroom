import { useSyncExternalStore } from 'react'

/**
 * Light / dark mode of the whole app. The choice is kept in localStorage under THEME_STORAGE_KEY
 * and mirrored on `<html data-theme>`, which every Blask style keys off (`[data-theme='dark'] …`
 * in CSS, the `dark:` variant in Tailwind). Without a stored choice the system preference applies
 * and is followed live. The inline script in index.html applies the same rule before the first
 * paint, so keep the two in sync.
 */
export type Theme = 'light' | 'dark'

export const THEME_STORAGE_KEY = 'qc:theme'
const SYSTEM_DARK = '(prefers-color-scheme: dark)'
/** The browser chrome's colour per mode: the page tone (--color-blask-page). */
const CHROME: Record<Theme, string> = { light: '#eef1f7', dark: '#060a2b' }
const listeners = new Set<() => void>()

function readStored(): Theme | null {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' || stored === 'dark' ? stored : null
  } catch {
    return null
  }
}

function systemTheme(): Theme {
  return window.matchMedia(SYSTEM_DARK).matches ? 'dark' : 'light'
}

let current: Theme = typeof window === 'undefined' ? 'light' : (readStored() ?? systemTheme())

function mirror(theme: Theme) {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', CHROME[theme])
}

function apply(theme: Theme) {
  current = theme
  mirror(theme)
  for (const listener of listeners) listener()
}

if (typeof window !== 'undefined') {
  mirror(current)
  window.matchMedia(SYSTEM_DARK).addEventListener('change', () => {
    if (readStored() === null) apply(systemTheme())
  })
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function snapshot() {
  return current
}

/** Sets and remembers the mode. */
export function setTheme(theme: Theme) {
  if (theme === current) return
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  } catch {
    // Storage can be blocked (private mode); the choice then lasts for this visit only.
  }
  apply(theme)
}

/** The current mode and its setter; every caller re-renders when it changes. */
export function useTheme() {
  const theme = useSyncExternalStore(subscribe, snapshot, () => 'light' as Theme)
  return [theme, setTheme] as const
}
