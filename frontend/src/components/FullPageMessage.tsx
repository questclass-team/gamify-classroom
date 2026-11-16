import type { ReactNode } from 'react'

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen place-items-center text-muted" role="status">
      {children}
    </div>
  )
}
