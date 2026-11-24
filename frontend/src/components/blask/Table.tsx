import { useId, type ReactNode } from 'react'

/**
 * A data table in the kit's style, usually inside `<Panel padded={false}>`. The caption names
 * the table for screen readers (visually the panel title does; `captionVisible` shows it). In a
 * narrow container (< 36rem) rows become labelled cards: give cells `data-label` (the column
 * name shown before the value), mark numbers with `data-numeric` and the row's buttons cell with
 * `data-actions`. The wrapper is a focusable, named region so it can be scrolled by keyboard.
 */
export function Table({
  caption,
  captionVisible = false,
  children,
}: {
  caption: string
  captionVisible?: boolean
  /** `<thead>` and `<tbody>`. */
  children: ReactNode
}) {
  const captionId = useId()
  return (
    <div role="region" aria-labelledby={captionId} tabIndex={0} className="blask-table-wrap">
      <table className="blask-table">
        <caption
          id={captionId}
          className={captionVisible ? 'px-5 pt-4 pb-2 text-left font-semibold' : 'sr-only'}
        >
          {caption}
        </caption>
        {children}
      </table>
    </div>
  )
}
