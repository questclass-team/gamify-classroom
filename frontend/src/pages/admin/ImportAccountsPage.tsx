import { useId, useRef, useState, type DragEvent, type FormEvent, type Ref } from 'react'
import { importUsers } from '../../api/admin'
import { apiErrorMessage } from '../../api/errorMessage'
import {
  USER_IMPORT_CSV_HEADER,
  type ImportSkipReason,
  type UserImportReport,
} from '../../api/types'
import { ROLE_LABEL } from '../../auth/roles'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { buttonClass } from '../../components/blask/buttonClass'
import { CloseIcon } from '../../components/blask/icons'
import { PageHeader } from '../../components/blask/PageHeader'
import { Panel } from '../../components/blask/Panel'
import { Table } from '../../components/blask/Table'
import { plural } from '../../format'

const HEADER_LINE = USER_IMPORT_CSV_HEADER.join(',')
const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(
  `${HEADER_LINE}\njkowalski,Jan,Kowalski,student\nanowak,Anna,Nowak,teacher\n`,
)}`

const SKIP_REASON_LABEL: Record<ImportSkipReason, string> = {
  already_exists: 'Konto już istnieje',
  duplicate_in_file: 'Login powtórzony w pliku',
  missing_field: 'Brak wymaganego pola',
  invalid_login: 'Nieprawidłowy login',
  invalid_role: 'Nieznana rola',
}

const IMPORT_ERRORS = {
  400: `Nie udało się odczytać pliku. Pierwszy wiersz musi zawierać nagłówek: ${HEADER_LINE}.`,
  403: 'Import kont jest dostępny wyłącznie dla administratora.',
  413: 'Plik jest za duży.',
}

const sizeFormat = new Intl.NumberFormat('pl-PL', { maximumFractionDigits: 1 })

function fileSize(bytes: number) {
  return bytes < 1024 ? `${bytes} B` : `${sizeFormat.format(bytes / 1024)} KB`
}

export function ImportAccountsPage() {
  const inputId = useId()
  const [file, setFile] = useState<File | null>(null)
  // Remounts the file input to clear it.
  const [inputKey, setInputKey] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<{ fileName: string; data: UserImportReport } | null>(null)
  const reportRef = useRef<HTMLHeadingElement>(null)

  function choose(selected: File | null) {
    setReport(null)
    if (selected !== null && !selected.name.toLowerCase().endsWith('.csv')) {
      setFile(null)
      setInputKey((key) => key + 1)
      setError('Wybierz plik w formacie CSV.')
      return
    }
    setError(null)
    setFile(selected)
  }

  function clear() {
    setFile(null)
    setError(null)
    setInputKey((key) => key + 1)
    requestAnimationFrame(() => document.getElementById(inputId)?.focus())
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    if (uploading) return
    const files = event.dataTransfer.files
    if (files.length > 1) {
      setError('Upuść jeden plik CSV.')
      return
    }
    choose(files[0] ?? null)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    if (file === null) {
      setError('Wybierz plik CSV do importu.')
      document.getElementById(inputId)?.focus()
      return
    }
    setError(null)
    setUploading(true)
    try {
      setReport({ fileName: file.name, data: await importUsers(file) })
      setFile(null)
      setInputKey((key) => key + 1)
      requestAnimationFrame(() => reportRef.current?.focus())
    } catch (caught) {
      setError(apiErrorMessage(caught, IMPORT_ERRORS))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Import kont"
        description="Dodaj konta z pliku CSV z loginami z domeny LABS. Istniejące konta są pomijane, więc ten sam plik można wgrać ponownie bez duplikatów."
      />

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <Panel title="Plik do importu">
          <form className="flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
            <div
              className="blask-dropzone"
              data-dragging={dragging || undefined}
              data-invalid={error !== null || undefined}
              onDragEnter={(event) => {
                event.preventDefault()
                if (!uploading) setDragging(true)
              }}
              onDragOver={(event) => {
                event.preventDefault()
                event.dataTransfer.dropEffect = uploading ? 'none' : 'copy'
              }}
              onDragLeave={(event) => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setDragging(false)
                }
              }}
              onDrop={handleDrop}
            >
              <input
                key={inputKey}
                id={inputId}
                type="file"
                accept=".csv,text/csv"
                className="blask-file-input sr-only"
                aria-invalid={error !== null || undefined}
                aria-describedby={`${inputId}-hint${error !== null ? ` ${inputId}-error` : ''}`}
                disabled={uploading}
                onChange={(event) => choose(event.target.files?.[0] ?? null)}
              />
              {file === null ? (
                <>
                  <p className="font-semibold text-blask-ink">
                    {dragging ? 'Upuść plik tutaj' : 'Przeciągnij tu plik CSV'}
                  </p>
                  <p id={`${inputId}-hint`} className="text-sm text-blask-graphite">
                    albo wybierz go z dysku. Jeden plik .csv z nagłówkiem w pierwszym wierszu.
                  </p>
                  <label htmlFor={inputId} className={buttonClass({ variant: 'outline' })}>
                    Wybierz plik
                  </label>
                </>
              ) : (
                <>
                  <p id={`${inputId}-hint`} className="sr-only">
                    Wybrany plik: {file.name}.
                  </p>
                  <div className="blask-file-chip">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-mono text-sm font-semibold text-blask-ink">
                        {file.name}
                      </span>
                      <span className="block text-sm text-blask-graphite">
                        {fileSize(file.size)}
                      </span>
                    </span>
                    <button
                      type="button"
                      className="blask-icon-btn shrink-0"
                      aria-label={`Usuń wybrany plik ${file.name}`}
                      disabled={uploading}
                      onClick={clear}
                    >
                      <CloseIcon className="size-5" />
                    </button>
                  </div>
                  <label
                    htmlFor={inputId}
                    className={buttonClass({ variant: 'quiet', size: 'sm' })}
                  >
                    Wybierz inny plik
                  </label>
                </>
              )}
            </div>

            {error !== null && (
              <BlaskNotice tone="error" className="w-full">
                <span id={`${inputId}-error`}>{error}</span>
              </BlaskNotice>
            )}

            <div>
              <Button variant="primary" type="submit" busy={uploading} busyLabel="Importowanie…">
                Importuj konta
              </Button>
            </div>
          </form>
        </Panel>

        <Panel title="Format pliku" headingLevel={2}>
          <div className="flex flex-col gap-3 text-sm text-blask-graphite">
            <p>
              Pierwszy wiersz to nagłówek, separator to przecinek lub średnik. Rola:{' '}
              <code className="font-mono text-blask-ink">student</code>,{' '}
              <code className="font-mono text-blask-ink">teacher</code> lub{' '}
              <code className="font-mono text-blask-ink">admin</code>.
            </p>
            <pre className="blask-code" tabIndex={0} aria-label="Przykład pliku CSV">
              {`${HEADER_LINE}\njkowalski,Jan,Kowalski,student`}
            </pre>
            <p>
              <a
                href={TEMPLATE_HREF}
                download="szablon-import-kont.csv"
                className="font-semibold text-blask-cobalt-deep underline decoration-blask-peri underline-offset-4 hover:decoration-blask-cobalt"
              >
                Pobierz szablon CSV
              </a>
            </p>
          </div>
        </Panel>
      </div>

      {report !== null && (
        <ImportReportView ref={reportRef} fileName={report.fileName} report={report.data} />
      )}
    </div>
  )
}

function ImportReportView({
  ref,
  fileName,
  report,
}: {
  ref: Ref<HTMLHeadingElement>
  fileName: string
  report: UserImportReport
}) {
  const created = report.created.length
  const skipped = report.skipped.length
  return (
    <section className="flex flex-col gap-5" aria-labelledby="report-heading">
      <div className="flex flex-col gap-1">
        <h2 id="report-heading" ref={ref} tabIndex={-1} className="blask-section-title">
          Raport importu
        </h2>
        <p className="text-blask-graphite">
          Plik <span className="font-mono text-blask-ink">{fileName}</span>:{' '}
          {created === 0 && skipped === 0
            ? 'nie zawiera żadnych kont.'
            : `${created} ${plural(created, 'konto dodane', 'konta dodane', 'kont dodanych')}, ${skipped} ${plural(skipped, 'wiersz pominięty', 'wiersze pominięte', 'wierszy pominiętych')}.`}
        </p>
      </div>

      <dl className="grid grid-cols-2 gap-4 sm:max-w-md">
        <Stat label="Dodano" value={created} lit />
        <Stat label="Pominięto" value={skipped} />
      </dl>

      {skipped > 0 && (
        <Panel
          title="Pominięte wiersze"
          aside={<span className="blask-num">{skipped}</span>}
          padded={false}
        >
          <Table caption="Pominięte wiersze">
            <thead>
              <tr>
                <th scope="col">Login</th>
                <th scope="col" data-numeric>
                  Wiersz
                </th>
                <th scope="col">Powód</th>
              </tr>
            </thead>
            <tbody>
              {report.skipped.map((row) => (
                <tr key={row.line}>
                  <td className="font-mono">{row.login ?? '—'}</td>
                  <td data-label="Wiersz" data-numeric>
                    {row.line}
                  </td>
                  <td data-label="Powód">{SKIP_REASON_LABEL[row.reason]}</td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}

      {created > 0 && (
        <Panel
          title="Dodane konta"
          aside={<span className="blask-num">{created}</span>}
          padded={false}
        >
          <Table caption="Dodane konta">
            <thead>
              <tr>
                <th scope="col">Imię i nazwisko</th>
                <th scope="col">Login</th>
                <th scope="col">Rola</th>
                <th scope="col" data-numeric>
                  Wiersz
                </th>
              </tr>
            </thead>
            <tbody>
              {report.created.map((user) => (
                <tr key={user.line}>
                  <td className="font-medium text-blask-ink">{user.displayName}</td>
                  <td data-label="Login">
                    <span className="font-mono text-sm">{user.login}</span>
                  </td>
                  <td data-label="Rola">{ROLE_LABEL[user.role]}</td>
                  <td data-label="Wiersz" data-numeric>
                    {user.line}
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Panel>
      )}
    </section>
  )
}

function Stat({ label, value, lit = false }: { label: string; value: number; lit?: boolean }) {
  return (
    <div className="blask-panel flex flex-col gap-1 px-5 py-4">
      <dt className="text-sm text-blask-graphite">{label}</dt>
      <dd
        className={`blask-num font-blask-display text-4xl font-semibold ${lit ? 'text-blask-cobalt' : 'text-blask-ink'}`}
      >
        {value}
      </dd>
    </div>
  )
}
