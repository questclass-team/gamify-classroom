import { useState, type ReactNode } from 'react'
import type { GroupStudent } from '../../../api/types'
import { Amount, type Currency } from '../../../components/blask/CurrencyMark'
import { ChevronIcon, SearchIcon } from '../../../components/blask/icons'
import { plural } from '../../../format'
import { filterStudents } from './bulkAward'
import type { ProgressState } from './StudentDetail'

interface StudentListProps {
  students: GroupStudent[]
  progress: Readonly<Record<string, ProgressState>>
  currency: Currency
  selected: ReadonlySet<string>
  onSelect: (ids: readonly string[], checked: boolean) => void
  openId: string | null
  onOpen: (id: string) => void
  /** The open student's detail, rendered under the row. */
  detail: (student: GroupStudent, id: string) => ReactNode
  onRetryProgress: () => void
}

/**
 * Students with search and multi-select (checkboxes, "select all" for the shown rows). Each row
 * shows the balance and rank; its button opens the student's detail right under it.
 */
export function StudentList({
  students,
  progress,
  currency,
  selected,
  onSelect,
  openId,
  onOpen,
  detail,
  onRetryProgress,
}: StudentListProps) {
  const [query, setQuery] = useState('')
  const shown = filterStudents(students, query)
  const shownIds = shown.map((student) => student.id)
  const shownSelected = shownIds.filter((id) => selected.has(id)).length
  const allShown = shown.length > 0 && shownSelected === shown.length
  const failed = students.filter((student) => progress[student.id]?.status === 'error').length

  return (
    <section aria-labelledby="awards-students-title" className="blask-panel min-w-0">
      <div className="blask-panel-head">
        <h2 id="awards-students-title" className="blask-panel-title flex items-baseline gap-2">
          Studenci
          <span className="blask-num text-[0.9375rem] font-normal text-blask-graphite">
            {students.length}
          </span>
        </h2>
        <div className="flex items-center gap-3 text-sm">
          <p aria-live="polite" className="text-blask-graphite">
            Wybrano: <span className="blask-num font-semibold text-blask-ink">{selected.size}</span>
          </p>
          {selected.size > 0 && (
            <a
              href="#award-panel"
              className="font-semibold text-blask-cobalt-deep underline lg:hidden"
            >
              Przejdź do nagrody
            </a>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-3 px-4 pt-4 pb-2 sm:px-5">
        <div role="search" className="relative">
          <label htmlFor="awards-search" className="sr-only">
            Szukaj studenta po imieniu, nazwisku albo loginie
          </label>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3.5 size-[1.125rem] -translate-y-1/2 text-blask-graphite" />
          <input
            id="awards-search"
            type="search"
            className="blask-input pl-10"
            placeholder="Szukaj: imię, nazwisko albo login"
            autoComplete="off"
            spellCheck={false}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>
        <div className="flex min-h-11 flex-wrap items-center justify-between gap-x-4 gap-y-1">
          <label className="-ml-1 flex min-h-11 cursor-pointer items-center gap-3 rounded-lg px-1 py-2 text-[0.9375rem] font-medium">
            <input
              type="checkbox"
              className="blask-check"
              checked={allShown}
              disabled={shown.length === 0}
              ref={(input) => {
                if (input !== null) input.indeterminate = shownSelected > 0 && !allShown
              }}
              onChange={(event) => onSelect(shownIds, event.target.checked)}
            />
            {query.trim() === '' ? 'Zaznacz wszystkich' : `Zaznacz znalezionych (${shown.length})`}
          </label>
          {selected.size > 0 && (
            <button
              type="button"
              className="blask-btn blask-btn-sm blask-btn-quiet"
              onClick={() => onSelect([...selected], false)}
            >
              Wyczyść wybór
            </button>
          )}
        </div>
        {failed > 0 && (
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span>
              Nie udało się wczytać salda {failed} {plural(failed, 'osoby', 'osób', 'osób')}.
            </span>
            <button
              type="button"
              className="font-semibold text-blask-cobalt-deep underline"
              onClick={onRetryProgress}
            >
              Wczytaj ponownie
            </button>
          </p>
        )}
      </div>

      {shown.length === 0 ? (
        <p className="border-t border-[var(--blask-divider)] px-5 py-6 text-[0.9375rem] text-blask-graphite">
          Nikt nie pasuje do „{query.trim()}”. Sprawdź pisownię albo wpisz część loginu.
        </p>
      ) : (
        <ul className="border-t border-[var(--blask-divider)]">
          {shown.map((student) => {
            const open = openId === student.id
            const detailId = `award-detail-${student.id}`
            const isSelected = selected.has(student.id)
            return (
              <li
                key={student.id}
                className={`blask-row ${isSelected ? 'bg-blask-peri-soft/60 hover:bg-blask-peri-soft' : ''}`}
              >
                <div className="flex items-center gap-1 pr-2 pl-2 sm:pr-3 sm:pl-3">
                  <label className="grid size-11 flex-none cursor-pointer place-items-center rounded-lg">
                    <input
                      type="checkbox"
                      className="blask-check"
                      checked={isSelected}
                      aria-label={`Zaznacz: ${student.displayName}`}
                      onChange={(event) => onSelect([student.id], event.target.checked)}
                    />
                  </label>
                  <button
                    type="button"
                    aria-expanded={open}
                    aria-controls={open ? detailId : undefined}
                    onClick={() => onOpen(student.id)}
                    className="group grid min-h-14 min-w-0 flex-1 cursor-pointer grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-3 rounded-lg py-2 pr-1 pl-1 text-left"
                  >
                    <span className="flex min-w-0 flex-col">
                      <span className="truncate leading-snug font-semibold group-hover:underline">
                        {student.displayName}
                      </span>
                      <span className="truncate text-sm text-blask-graphite">{student.login}</span>
                    </span>
                    <BalanceCell state={progress[student.id]} currency={currency} />
                    <ChevronIcon
                      className={`size-4 text-blask-graphite transition-transform duration-300 ${open ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>
                {open && detail(student, detailId)}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

function BalanceCell({
  state,
  currency,
}: {
  state: ProgressState | undefined
  currency: Currency
}) {
  if (state === undefined || state.status === 'loading') {
    return (
      <span className="flex flex-col items-end gap-1.5">
        <span aria-hidden="true" className="blask-skeleton h-4 w-14" />
        <span aria-hidden="true" className="blask-skeleton h-3 w-16" />
        <span className="sr-only">Ładowanie salda</span>
      </span>
    )
  }
  if (state.status === 'error') {
    return <span className="text-sm text-blask-graphite">Brak danych</span>
  }
  return (
    <span className="flex flex-col items-end">
      <Amount value={state.balance} currency={currency} className="font-semibold" />
      <span className="max-w-[9rem] truncate text-sm text-blask-graphite">
        {state.rank?.name ?? 'Bez rangi'}
      </span>
    </span>
  )
}
