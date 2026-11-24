import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { mergeHistory, type HistoryEntry } from '../../api/awardHistory'
import type { StudentGroupState } from '../../api/types'
import { Button } from '../../components/blask/Button'
import { Amount, type Currency } from '../../components/blask/CurrencyMark'
import { AwardIcon, CoinsIcon } from '../../components/blask/icons'
import { dateTimeFormat, plural } from '../../format'
import { useInView } from './useInView'

/** Entries shown before "Pokaż całą kronikę". */
const FIRST_ENTRIES = 8

/**
 * The Kronika on the line of light, as in the lab's Panel: "Teraz" glows at the top and the light
 * runs down into the past through every point reward and badge, newest first, each with its
 * reason, date and the teacher who gave it. A long history shows its newest entries first.
 */
export function Chronicle({
  data,
  currency,
  teacherName,
}: {
  data: StudentGroupState
  currency: Currency
  teacherName: string
}) {
  const entries = mergeHistory(data.rewards, data.badges)
  const [expanded, setExpanded] = useState(false)
  const listId = useId()

  if (entries.length === 0) {
    return (
      <p className="rounded-[16px] border border-dashed border-blask-peri px-5 py-8 text-center text-blask-graphite">
        Kronika jest jeszcze pusta. Każda nagroda i odznaka od prowadzącego pojawi się tutaj z
        uzasadnieniem i datą.
      </p>
    )
  }

  const shown = expanded ? entries : entries.slice(0, FIRST_ENTRIES)
  const hidden = entries.length - shown.length

  return (
    <div className="@container flex flex-col gap-3">
      <LightLine>
        <ol id={listId} className="mt-1">
          {shown.map((entry) => (
            <ChronicleRow
              key={entry.key}
              entry={entry}
              currency={currency}
              teacherName={teacherName}
            />
          ))}
        </ol>
      </LightLine>
      {(hidden > 0 || expanded) && entries.length > FIRST_ENTRIES && (
        <Button
          variant="quiet"
          size="sm"
          className="self-start"
          aria-controls={listId}
          aria-expanded={expanded}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded
            ? 'Pokaż tylko najnowsze'
            : `Pokaż całą kronikę (jeszcze ${hidden} ${plural(hidden, 'wpis', 'wpisy', 'wpisów')})`}
        </Button>
      )}
    </div>
  )
}

function ChronicleRow({
  entry,
  currency,
  teacherName,
}: {
  entry: HistoryEntry
  currency: Currency
  teacherName: string
}) {
  const Icon = entry.kind === 'points' ? CoinsIcon : AwardIcon
  return (
    <li className="relative grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5 @min-[24rem]:grid-cols-[1.25rem_minmax(0,1fr)_auto]">
      <span
        aria-hidden="true"
        className="blask-ray__node top-1/2 -mt-[5.5px]"
        data-kind={entry.kind}
      />
      <Icon
        className={`size-4 @max-[24rem]:hidden ${entry.kind === 'badge' ? 'text-blask-iris' : 'text-blask-cobalt'}`}
      />
      <span className="min-w-0">
        <span className="sr-only">{entry.kind === 'points' ? 'Nagroda' : 'Odznaka'}: </span>
        <span className="block leading-snug font-medium">
          {entry.kind === 'points' ? (
            entry.reason === '' ? (
              'Nagroda bez uzasadnienia'
            ) : (
              entry.reason
            )
          ) : (
            <>
              <span aria-hidden="true">Odznaka </span>„{entry.badge.name}”
            </>
          )}
        </span>
        <span className="block text-[0.8125rem] text-blask-graphite">
          {teacherName}, {dateTimeFormat.format(new Date(entry.createdAt))}
        </span>
      </span>
      {entry.kind === 'points' ? (
        <Amount
          value={entry.points}
          currency={currency}
          signed
          className="justify-end text-right font-semibold"
        />
      ) : (
        <span className="text-right text-sm text-blask-graphite">bez punktów</span>
      )}
    </li>
  )
}

/**
 * The line of light: a dim track, and the lit part from "Teraz" down into the past (measured from
 * the "Teraz" mark, following layout changes). The light runs down once when it comes into view.
 */
function LightLine({ children }: { children: ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const shown = useInView(rootRef)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (root === null) return
    const measure = () => {
      const now = root.querySelector<HTMLElement>('[data-line-now]')
      let at = 0
      if (now !== null) {
        const box = now.getBoundingClientRect()
        at = box.top + box.height / 2 - root.getBoundingClientRect().top
      }
      root.style.setProperty('--blask-fill-top', `${Math.max(0, at)}px`)
      root.style.setProperty('--blask-fill', `${Math.max(0, root.offsetHeight - at)}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(root)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={rootRef} className="blask-ray blask-ray--lit" data-shown={shown}>
      <span aria-hidden="true" className="blask-ray__track" />
      <span aria-hidden="true" className="blask-ray__fill" />
      <div data-line-now className="blask-now">
        <span aria-hidden="true" className="blask-now__point" />
        <span className="blask-now__label">Teraz</span>
        <span aria-hidden="true" className="blask-now__rule" />
      </div>
      {children}
    </div>
  )
}
