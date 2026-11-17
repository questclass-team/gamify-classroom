import { useEffect, useState } from 'react'
import { searchStudents } from '../../api/groups'
import { STUDENT_SEARCH_MIN_LENGTH, type StudentSummary } from '../../api/types'
import { Alert, Button, TextField } from '../../components/ui'

const SEARCH_DELAY_MS = 250

type SearchResult =
  | { query: string; status: 'ready'; students: StudentSummary[] }
  | { query: string; status: 'error' }

interface StudentPickerProps {
  memberIds: ReadonlySet<string>
  /** Id of the student being added right now; all add buttons are disabled meanwhile. */
  addingId: string | null
  onAdd: (student: StudentSummary) => void
}

/** Search among imported students; members are listed but cannot be added twice. */
export function StudentPicker({ memberIds, addingId, onAdd }: StudentPickerProps) {
  const [query, setQuery] = useState('')
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

  return (
    <div role="search" className="flex flex-col gap-3">
      <TextField
        id="student-search"
        label="Szukaj studenta"
        type="search"
        placeholder="Login albo imię i nazwisko"
        autoComplete="off"
        spellCheck={false}
        enterKeyHint="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
      />

      <div aria-live="polite" className="text-sm text-muted">
        {!searchable && `Wpisz co najmniej ${STUDENT_SEARCH_MIN_LENGTH} znaki.`}
        {searchable && current === null && 'Szukam…'}
        {current?.status === 'ready' &&
          current.students.length > 0 &&
          `Znaleziono: ${current.students.length}`}
      </div>

      {current?.status === 'error' && (
        <Alert tone="error">Nie udało się wyszukać studentów. Spróbuj ponownie.</Alert>
      )}

      {current?.status === 'ready' && current.students.length === 0 && (
        <Alert tone="info">
          Brak studentów pasujących do „{current.query}”. Konto musi być wcześniej zaimportowane
          przez administratora.
        </Alert>
      )}

      {current?.status === 'ready' && current.students.length > 0 && (
        <ul className="divide-y divide-line border-y border-line">
          {current.students.map((student) => (
            <li key={student.id} className="flex items-center justify-between gap-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate font-medium">{student.displayName}</p>
                <p className="truncate font-mono text-xs text-muted">{student.login}</p>
              </div>
              {memberIds.has(student.id) ? (
                <span className="flex shrink-0 items-center gap-1 text-xs font-medium text-success">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-4"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    aria-hidden="true"
                  >
                    <path d="m5 12.5 4.5 4.5L19 7" />
                  </svg>
                  W grupie
                </span>
              ) : (
                <Button
                  size="sm"
                  variant="secondary"
                  className="shrink-0"
                  disabled={addingId !== null}
                  aria-label={`Dodaj ${student.displayName}`}
                  onClick={() => onAdd(student)}
                >
                  {addingId === student.id ? 'Dodawanie…' : 'Dodaj'}
                </Button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
