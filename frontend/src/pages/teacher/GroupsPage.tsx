import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiErrorMessage } from '../../api/errorMessage'
import { createGroup, fetchGroups } from '../../api/groups'
import { GROUP_NAME_MAX_LENGTH, type GroupSummary } from '../../api/types'
import { useApiData, type LoadState } from '../../api/useApiData'
import {
  Alert,
  Button,
  ErrorWithRetry,
  PageHeader,
  Panel,
  SectionTitle,
  Table,
  TextField,
} from '../../components/ui'
import { dateFormat } from '../../format'

const CREATE_ERRORS = {
  400: `Nazwa grupy jest wymagana i może mieć najwyżej ${GROUP_NAME_MAX_LENGTH} znaków.`,
}

export function GroupsPage() {
  const { state, reload, update } = useApiData(fetchGroups)

  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState<string | null>(null)

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const trimmed = name.trim()
    if (trimmed === '') {
      setCreateError('Podaj nazwę grupy.')
      return
    }
    setCreateError(null)
    setCreatedName(null)
    setCreating(true)
    try {
      const group = await createGroup({ name: trimmed })
      update((groups) => [...groups, group].sort((a, b) => a.name.localeCompare(b.name, 'pl')))
      setName('')
      setCreatedName(group.name)
    } catch (error) {
      setCreateError(apiErrorMessage(error, CREATE_ERRORS))
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Moje grupy"
        description="Grupy, które prowadzisz. Każda ma osobną listę studentów, punkty i rangi."
      />

      <Panel>
        <SectionTitle>Nowa grupa</SectionTitle>
        <form className="flex flex-wrap items-end gap-4" onSubmit={handleCreate} noValidate>
          <div className="min-w-0 flex-[1_1_16rem]">
            <TextField
              id="group-name"
              label="Nazwa grupy"
              placeholder="np. Inżynieria oprogramowania – grupa 1"
              value={name}
              maxLength={GROUP_NAME_MAX_LENGTH}
              onChange={(event) => setName(event.target.value)}
              disabled={creating}
            />
          </div>
          <Button type="submit" disabled={creating}>
            {creating ? 'Tworzenie…' : 'Utwórz grupę'}
          </Button>
        </form>
        {createError !== null && <Alert tone="error">{createError}</Alert>}
        {createdName !== null && <Alert tone="success">Utworzono grupę „{createdName}”.</Alert>}
      </Panel>

      <GroupsList state={state} onRetry={reload} />
    </div>
  )
}

function GroupsList({ state, onRetry }: { state: LoadState<GroupSummary[]>; onRetry: () => void }) {
  if (state.status === 'loading') {
    return <p className="text-muted">Ładowanie grup…</p>
  }
  if (state.status === 'error') {
    return <ErrorWithRetry message={apiErrorMessage(state.error)} onRetry={onRetry} />
  }
  if (state.data.length === 0) {
    return <Alert tone="info">Nie masz jeszcze żadnych grup. Utwórz pierwszą powyżej.</Alert>
  }
  return (
    <Table caption={`Grupy (${state.data.length})`}>
      <thead>
        <tr>
          <th scope="col">Nazwa</th>
          <th scope="col" data-numeric>
            Studenci
          </th>
          <th scope="col">Utworzono</th>
        </tr>
      </thead>
      <tbody>
        {state.data.map((group) => (
          <tr key={group.id}>
            <td>
              <Link
                to={`/teacher/groups/${group.id}`}
                className="font-medium text-primary underline-offset-2 hover:underline focus-visible:underline"
              >
                {group.name}
              </Link>
            </td>
            <td data-label="Studenci" data-numeric>
              {group.studentCount}
            </td>
            <td data-label="Utworzono" className="whitespace-nowrap text-muted">
              {dateFormat.format(new Date(group.createdAt))}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
