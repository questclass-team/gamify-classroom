import { useEffect, useState } from 'react'
import { searchStudents } from '../../api/groups'
import { STUDENT_SEARCH_MIN_LENGTH, type StudentSummary } from '../../api/types'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { TextField } from '../../components/blask/Field'
import { CheckIcon, PlusIcon } from '../../components/blask/icons'
import { plural } from '../../format'

const SEARCH_DELAY_MS = 250

type SearchResult =
  | { query: string; status: 'ready'; students: StudentSummary[] }
  | { query: string; status: 'error' }

interface StudentPickerProps {
  memberIds: ReadonlySet<string>
  /** Id of the student being added right now; all add buttons wait meanwhile. */
  addingId: string | null
  onAdd: (student: StudentSummary) => void
}

/** Search among imported students; members are listed but cannot be added twice. */
export function StudentPicker({ memberIds, addingId, onAdd }: StudentPickerProps) {
  const [query, setQuery] = useState('')
  // The add button turns into "W grupie": keep the keyboard focus on that row.
  const [focusId, setFocusId] = useState<string | null>(null)
  const [result, setResult] = useState<SearchResult | null>(null)
  const trimmed = query.trim()
  const searchable = trimmed.length >= STUDENT_SEARCH_MIN_LENGTH

  useEffect(() => {
    if (!searchable) return
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      searchStudents(trimmed, controller.signal).then(
        (students) => setResult({ query: trimmed, status: 'ready', students }),
        () => {
          if (!controller.signal.aborted) setResult({ query: trimmed, status: 'error' })
        },
      )
    }, SEARCH_DELAY_MS)
    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [trimmed, searchable])

  // Results of an older query are never shown for the current one.
  const current = searchable && result?.query === trimmed ? result : null
  const found = current?.status === 'ready' ? current.students : null

  return (
    <div role="search" className="flex flex-col gap-3">
      <TextField
        label="Szukaj studenta"
        type="search"
        placeholder="Login albo imię i nazwisko"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Escape' && query !== '') {
            event.preventDefault()
            setQuery('')
          }
        }}
      />

      <p aria-live="polite" className="text-sm text-blask-graphite">
        {!searchable && `Wpisz co najmniej ${STUDENT_SEARCH_MIN_LENGTH} znaki.`}
        {searchable && current === null && 'Szukam…'}
        {found !== null &&
          found.length > 0 &&
          `${found.length} ${plural(found.length, 'wynik', 'wyniki', 'wyników')}`}
      </p>

      {current?.status === 'error' && (
        <BlaskNotice tone="error">Nie udało się wyszukać studentów. Spróbuj ponownie.</BlaskNotice>
      )}

      {found !== null && found.length === 0 && (
        <BlaskNotice tone="info">
          Brak studentów pasujących do „{trimmed}”. Konto musi być wcześniej zaimportowane przez
          administratora.
        </BlaskNotice>
      )}

      {found !== null && found.length > 0 && (
        <ul className="-mx-5 border-t border-(--blask-divider) sm:-mx-6">
          {found.map((student) => (
            <li
              key={student.id}
              className="blask-row flex items-center justify-between gap-3 px-5 py-2.5 sm:px-6"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-blask-ink">{student.displayName}</p>
                <p className="truncate font-mono text-xs text-blask-graphite">{student.login}</p>
              </div>
              {memberIds.has(student.id) ? (
                <span
                  tabIndex={-1}
                  ref={(node) => {
                    if (node !== null && student.id === focusId) {
                      node.focus()
                      setFocusId(null)
                    }
                  }}
                  className="blask-chip blask-chip-line min-h-7 shrink-0 gap-1 px-2.5 text-xs"
                >
                  <CheckIcon className="size-3.5" />W grupie
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  disabled={addingId !== null && addingId !== student.id}
                  busy={addingId === student.id}
                  busyLabel="Dodawanie…"
                  aria-label={`Dodaj ${student.displayName}`}
                  onClick={() => {
                    setFocusId(student.id)
                    onAdd(student)
                  }}
                >
                  <PlusIcon className="size-4" />
                  Dodaj
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
