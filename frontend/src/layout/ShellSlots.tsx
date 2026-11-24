import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { useShell } from './shellContext'

/**
 * Puts the page's own small control into the header, before the account (the Panel's balance
 * chip). Rendered while the page is mounted; keep it to one compact element, hidden on phones if
 * the header would overflow (`max-sm:hidden`).
 */
export function ShellAside({ children }: { children: ReactNode }) {
  const { asideSlot } = useShell()
  return asideSlot === null ? null : createPortal(children, asideSlot)
}

/**
 * A second header row under the app links, sticky with the header (the Panel's section links,
 * `blask-sublink` in a `blask-content` row). Rendered while the page is mounted.
 */
export function ShellSubnav({ children }: { children: ReactNode }) {
  const { subnavSlot } = useShell()
  return subnavSlot === null ? null : createPortal(children, subnavSlot)
}
