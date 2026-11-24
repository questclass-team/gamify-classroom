import type { ReactNode } from 'react'

export function FullPageMessage({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh place-items-center text-blask-graphite" role="status">
      {children}
    </div>
  )
}
