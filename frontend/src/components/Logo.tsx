/**
 * Pixel-art shield mark plus wordmark.
 * `compact` hides the wordmark visually on phones (screen readers still get the name).
 */
export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex shrink-0 items-center gap-2.5">
      <svg
        viewBox="0 0 12 14"
        className="h-7 w-auto"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <g className="fill-accent">
          <rect x="1" y="0" width="10" height="1" />
          <rect x="0" y="1" width="12" height="7" />
          <rect x="1" y="8" width="10" height="2" />
          <rect x="2" y="10" width="8" height="1" />
          <rect x="3" y="11" width="6" height="1" />
          <rect x="4" y="12" width="4" height="1" />
          <rect x="5" y="13" width="2" height="1" />
        </g>
        <g className="fill-primary">
          <rect x="2" y="2" width="8" height="6" />
          <rect x="3" y="8" width="6" height="2" />
          <rect x="4" y="10" width="4" height="1" />
          <rect x="5" y="11" width="2" height="1" />
        </g>
        <g className="fill-accent">
          <rect x="5" y="3" width="2" height="7" />
          <rect x="3" y="5" width="6" height="2" />
        </g>
      </svg>
      <span
        className={`font-display text-xl font-semibold tracking-tight ${compact ? 'sr-only sm:not-sr-only' : ''}`}
      >
        QuestClass
      </span>
    </span>
  )
}
