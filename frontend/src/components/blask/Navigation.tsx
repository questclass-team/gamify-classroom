import { Link, NavLink } from 'react-router'

export interface Crumb {
  label: string
  /** Omit for the current page (always the last crumb). */
  to?: string
}

/** Where the page sits: links back up, the current page last (aria-current), "/" between. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  return (
    <nav aria-label="Ścieżka" className="blask-crumbs">
      <ol>
        {items.map((item, index) => (
          <li key={`${index}-${item.label}`}>
            {item.to !== undefined && index < items.length - 1 ? (
              <Link to={item.to}>{item.label}</Link>
            ) : (
              <span aria-current="page">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  )
}

export interface RouteTab {
  to: string
  label: string
  /** Match the path exactly (the index tab), so deeper tabs don't light it too. */
  end?: boolean
}

/**
 * Section tabs that are routes (a group's Studenci / Nagrody / Punkty i rangi): links with
 * aria-current on the current one and the glint under it. On phones they scroll sideways.
 */
export function RouteTabs({ label, tabs }: { label: string; tabs: RouteTab[] }) {
  return (
    <nav aria-label={label} className="blask-tabs">
      {tabs.map((tab) => (
        <NavLink key={tab.to} to={tab.to} end={tab.end} className="blask-tab">
          {tab.label}
        </NavLink>
      ))}
    </nav>
  )
}
