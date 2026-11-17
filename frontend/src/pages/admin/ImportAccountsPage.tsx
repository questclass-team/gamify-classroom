import { useState, type ChangeEvent, type FormEvent } from 'react'
import { importUsers } from '../../api/admin'
import { apiErrorMessage } from '../../api/errorMessage'
import {
  USER_IMPORT_CSV_HEADER,
  type ImportSkipReason,
  type UserImportReport,
} from '../../api/types'
import { ROLE_LABEL } from '../../auth/roles'
import { Alert, Button, PageHeader, Panel, SectionTitle, Table } from '../../components/ui'

const HEADER_LINE = USER_IMPORT_CSV_HEADER.join(',')
const TEMPLATE_HREF = `data:text/csv;charset=utf-8,${encodeURIComponent(
  `${HEADER_LINE}\njkowalski,Jan,Kowalski,student\nanowak,Anna,Nowak,teacher\n`,
)}`

const SKIP_REASON_LABEL: Record<ImportSkipReason, string> = {
  already_exists: 'Konto już istnieje',
  duplicate_in_file: 'Login powtórzony w pliku',
  missing_field: 'Brak wymaganego pola',
  invalid_role: 'Nieznana rola',
}

const IMPORT_ERRORS = {
  400: `Nie udało się odczytać pliku. Pierwszy wiersz musi zawierać nagłówek: ${HEADER_LINE}.`,
  403: 'Import kont jest dostępny wyłącznie dla administratora.',
  413: 'Plik jest za duży.',
}

export function ImportAccountsPage() {
  const [file, setFile] = useState<File | null>(null)
  // Remounts the file input to clear it after a successful import.
  const [inputKey, setInputKey] = useState(0)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [report, setReport] = useState<{ fileName: string; data: UserImportReport } | null>(null)

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const selected = event.target.files?.[0] ?? null
    setReport(null)
    if (selected !== null && !selected.name.toLowerCase().endsWith('.csv')) {
      setFile(null)
      setError('Wybierz plik w formacie CSV.')
      return
    }
    setError(null)
    setFile(selected)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (file === null) {
      setError('Wybierz plik CSV do importu.')
      return
    }
    setError(null)
    setUploading(true)
    try {
      setReport({ fileName: file.name, data: await importUsers(file) })
      setFile(null)
      setInputKey((key) => key + 1)
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

      <Panel>
        <SectionTitle>Plik do importu</SectionTitle>
        <div className="flex flex-col gap-2 text-sm text-muted">
          <p>
            Pierwszy wiersz to nagłówek, separator to przecinek lub średnik. Rola:{' '}
            <code className="font-mono text-fg">student</code>,{' '}
            <code className="font-mono text-fg">teacher</code> lub{' '}
            <code className="font-mono text-fg">admin</code>.
          </p>
          <pre className="overflow-x-auto rounded-ui bg-surface-muted px-3 py-2 font-mono text-xs text-fg">
            {`${HEADER_LINE}\njkowalski,Jan,Kowalski,student`}
          </pre>
          <p>
            <a
              href={TEMPLATE_HREF}
              download="szablon-import-kont.csv"
              className="font-medium text-primary underline underline-offset-2 hover:no-underline"
            >
              Pobierz szablon CSV
            </a>
          </p>
        </div>

        <form
          className="flex flex-col gap-2 border-t border-line pt-4"
          onSubmit={handleSubmit}
          noValidate
        >
          <label htmlFor="csv-file" className="text-sm font-medium">
            Plik CSV
          </label>
          <div className="flex flex-wrap items-center gap-4">
            <input
              key={inputKey}
              id="csv-file"
              type="file"
              accept=".csv,text/csv"
              className="min-w-64 flex-1 text-sm text-muted file:mr-3 file:min-h-10 file:cursor-pointer file:rounded-ui file:border-ui file:border-line-strong file:bg-surface file:px-4 file:font-sans file:text-sm file:font-semibold file:text-fg hover:file:bg-surface-muted"
              onChange={handleFileChange}
              disabled={uploading}
            />
            <Button type="submit" disabled={uploading || file === null}>
              {uploading ? 'Importowanie…' : 'Importuj'}
            </Button>
          </div>
          {error !== null && <Alert tone="error">{error}</Alert>}
        </form>
      </Panel>

      {report !== null && <ImportReportView fileName={report.fileName} report={report.data} />}
    </div>
  )
}

function ImportReportView({ fileName, report }: { fileName: string; report: UserImportReport }) {
  return (
    <section className="flex flex-col gap-5" aria-labelledby="report-heading">
      <SectionTitle id="report-heading">
        Raport importu{' '}
        <span className="font-mono text-base font-normal text-muted">{fileName}</span>
      </SectionTitle>

      <dl className="grid grid-cols-2 divide-x divide-line rounded-ui border-ui border-line bg-surface sm:max-w-md">
        <Stat label="Dodano" value={report.created.length} className="text-success" />
        <Stat label="Pominięto" value={report.skipped.length} className="text-warning" />
      </dl>

      {report.created.length === 0 && report.skipped.length === 0 && (
        <Alert tone="info">Plik nie zawiera żadnych kont.</Alert>
      )}

      {report.skipped.length > 0 && (
        <Table caption="Pominięte wiersze">
          <thead>
            <tr>
              <th scope="col">Wiersz</th>
              <th scope="col">Login</th>
              <th scope="col">Powód</th>
            </tr>
          </thead>
          <tbody>
            {report.skipped.map((row) => (
              <tr key={row.line}>
                <td className="font-mono text-muted">{row.line}</td>
                <td className="font-mono">{row.login ?? '—'}</td>
                <td>{SKIP_REASON_LABEL[row.reason]}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}

      {report.created.length > 0 && (
        <Table caption="Dodane konta">
          <thead>
            <tr>
              <th scope="col">Wiersz</th>
              <th scope="col">Login</th>
              <th scope="col">Imię i nazwisko</th>
              <th scope="col">Rola</th>
            </tr>
          </thead>
          <tbody>
            {report.created.map((user) => (
              <tr key={user.line}>
                <td className="font-mono text-muted">{user.line}</td>
                <td className="font-mono">{user.login}</td>
                <td>{user.displayName}</td>
                <td>{ROLE_LABEL[user.role]}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </section>
  )
}

function Stat({ label, value, className }: { label: string; value: number; className: string }) {
  return (
    <div className="flex flex-col gap-0.5 px-5 py-4">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className={`font-display text-4xl font-semibold tabular-nums ${className}`}>{value}</dd>
    </div>
  )
}
