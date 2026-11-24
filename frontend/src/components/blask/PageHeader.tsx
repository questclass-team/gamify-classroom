import type { ReactNode } from 'react'

/**
 * The top of a page inside the shell: the page's one h1 (`blask-page-title`), an optional line
 * of description under it and the page's actions on the right (they wrap under on phones).
 * Breadcrumbs, when the page has them, go above it; tabs below it.
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
      <div className="flex max-w-full min-w-0 flex-col gap-2">
        <h1 className="blask-page-title">{title}</h1>
        {description != null && <p className="max-w-[62ch] text-blask-graphite">{description}</p>}
      </div>
      {actions != null && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  )
}
