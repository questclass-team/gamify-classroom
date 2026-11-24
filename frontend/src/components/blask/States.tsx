import { useId, type ReactNode } from 'react'

/**
 * Nothing here yet: what is missing, why, and the one way forward. Framed as its own panel by
 * default; `bare` when it sits inside a panel already.
 */
export function EmptyState({
  title,
  children,
  action,
  icon,
  headingLevel = 2,
  bare = false,
}: {
  title: string
  children?: ReactNode
  /** One button or link (LinkButton / Button). */
  action?: ReactNode
  /** A decorative icon (components/blask/icons) shown in a disc of light. */
  icon?: ReactNode
  headingLevel?: 2 | 3
  bare?: boolean
}) {
  const titleId = useId()
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <section aria-labelledby={titleId} className={`blask-empty ${bare ? '' : 'blask-panel'}`}>
      {icon != null && (
        <span aria-hidden="true" className="blask-empty__mark">
          {icon}
        </span>
      )}
      <Heading id={titleId} className="blask-section-title">
        {title}
      </Heading>
      {children != null && <div className="blask-copy flex flex-col gap-2">{children}</div>}
      {action != null && <div className="mt-1 flex flex-wrap gap-2">{action}</div>}
    </section>
  )
}

/** A loading placeholder bar; size it with classes (`h-5 w-3/4`). Decorative. */
export function Skeleton({ className = '' }: { className?: string }) {
  return <span aria-hidden="true" className={`blask-skeleton ${className}`} />
}

/**
 * While data loads: announces `label` politely once and shows the placeholder shapes in
 * `children` (Skeletons and panels laid out like the content to come), hidden from screen
 * readers. `className` lays the placeholders out (e.g. the grid the real cards will use).
 */
export function LoadingState({
  label,
  className = 'flex flex-col gap-3',
  children,
}: {
  label: string
  className?: string
  children: ReactNode
}) {
  return (
    <>
      <p role="status" className="sr-only">
        {label}
      </p>
      <div aria-hidden="true" className={className}>
        {children}
      </div>
    </>
  )
}
