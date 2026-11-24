import { createContext, useContext } from 'react'

export interface ShellValue {
  /** Shows a short confirmation under the header (polite live region); it leaves on its own. */
  notify: (text: string) => void
  /** Header slots the page fills through <ShellAside> and <ShellSubnav>. */
  asideSlot: HTMLElement | null
  subnavSlot: HTMLElement | null
}

export const ShellContext = createContext<ShellValue | null>(null)

/** The app shell around the page (every signed-in page has one). */
export function useShell(): ShellValue {
  const value = useContext(ShellContext)
  if (value === null) throw new Error('useShell must be used inside <AppShell>')
  return value
}
