import { useId, type HTMLAttributes, type ReactNode } from 'react'

/**
 * A panel, the unit every app section sits in: a white (evening: raised navy) card with a clear
 * edge and a soft shadow. With `title` it gets a head row (title left, `aside` right: a count, a
 * small action) and is named by the title. `padded={false}` lets rows, tables and lists run
 * edge to edge (give rows `blask-row`).
 */
export function Panel({
  title,
  headingLevel = 2,
  aside,
  padded = true,
  className = '',
  bodyClassName = '',
  children,
  ...props
}: Omit<HTMLAttributes<HTMLElement>, 'title'> & {
  title?: ReactNode
  /** 2 for sections of a page (default), 3 for panels under a section heading. */
  headingLevel?: 2 | 3
  aside?: ReactNode
  padded?: boolean
  bodyClassName?: string
}) {
  const titleId = useId()
  const Heading = headingLevel === 3 ? 'h3' : 'h2'
  return (
    <section
      aria-labelledby={title != null ? titleId : undefined}
      className={`blask-panel ${className}`}
      {...props}
    >
      {title != null && (
        <header className="blask-panel-head">
          <Heading id={titleId} className="blask-panel-title">
            {title}
          </Heading>
          {aside != null && <div className="text-sm text-blask-graphite">{aside}</div>}
        </header>
      )}
      {padded ? <div className={`blask-panel-body ${bodyClassName}`}>{children}</div> : children}
    </section>
  )
}
