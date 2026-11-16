import { useEffect, useState, type FormEvent } from 'react'
import { apiErrorMessage } from '../../api/errorMessage'
import { createGroup, fetchGroups } from '../../api/groups'
import { GROUP_NAME_MAX_LENGTH, type GroupSummary } from '../../api/types'
import {
  Alert,
  Button,
  PageHeader,
  Panel,
  SectionTitle,
  Table,
  TextField,
} from '../../components/ui'

type GroupsState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; groups: GroupSummary[] }

const dateFormat = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' })

const CREATE_ERRORS = {
  400: `Nazwa grupy jest wymagana i może mieć najwyżej ${GROUP_NAME_MAX_LENGTH} znaków.`,
}

export function GroupsPage() {
  const [groupsState, setGroupsState] = useState<GroupsState>({ status: 'loading' })
  const [reloadKey, setReloadKey] = useState(0)

  const [name, setName] = useState('')
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [createdName, setCreatedName] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()
    fetchGroups(controller.signal)
      .then((groups) => setGroupsState({ status: 'ready', groups }))
      .catch((error: unknown) => {
        if (!controller.signal.aborted) {
          setGroupsState({ status: 'error', message: apiErrorMessage(error) })
        }
      })
    return () => controller.abort()
  }, [reloadKey])

  function retry() {
    setGroupsState({ status: 'loading' })
    setReloadKey((key) => key + 1)
  }

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
      setGroupsState((current) =>
        current.status === 'ready'
          ? {
              status: 'ready',
              groups: [...current.groups, group].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
            }
          : current,
      )
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
          <div className="min-w-64 flex-1">
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

      <GroupsList state={groupsState} onRetry={retry} />
    </div>
  )
}

function GroupsList({ state, onRetry }: { state: GroupsState; onRetry: () => void }) {
  if (state.status === 'loading') {
    return <p className="text-muted">Ładowanie grup…</p>
  }
  if (state.status === 'error') {
    return (
      <div className="flex flex-col items-start gap-3">
        <Alert tone="error">{state.message}</Alert>
        <Button variant="secondary" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </div>
    )
  }
  if (state.groups.length === 0) {
    return <Alert tone="info">Nie masz jeszcze żadnych grup. Utwórz pierwszą powyżej.</Alert>
  }
  return (
    <Table caption={`Grupy (${state.groups.length})`}>
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
        {state.groups.map((group) => (
          <tr key={group.id}>
            <td className="font-medium">{group.name}</td>
            <td data-numeric>{group.studentCount}</td>
            <td className="whitespace-nowrap text-muted">
              {dateFormat.format(new Date(group.createdAt))}
            </td>
          </tr>
        ))}
      </tbody>
    </Table>
  )
}
