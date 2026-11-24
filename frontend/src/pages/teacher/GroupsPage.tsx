import { useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import { apiErrorMessage } from '../../api/errorMessage'
import { createGroup, fetchGroups } from '../../api/groups'
import { GROUP_NAME_MAX_LENGTH, type GroupSummary } from '../../api/types'
import { useApiData, type LoadState } from '../../api/useApiData'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { Dialog } from '../../components/blask/Dialog'
import { TextField } from '../../components/blask/Field'
import { GroupCover } from '../../components/blask/GroupCover'
import { PlusIcon } from '../../components/blask/icons'
import { PageHeader } from '../../components/blask/PageHeader'
import { EmptyState, LoadingState, Skeleton } from '../../components/blask/States'
import { dateFormat, plural } from '../../format'
import { useShell } from '../../layout/shellContext'

const CREATE_ERRORS = {
  400: `Nazwa grupy jest wymagana i może mieć najwyżej ${GROUP_NAME_MAX_LENGTH} znaków.`,
}

const CARD_GRID = 'grid grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))] gap-5'

export function GroupsPage() {
  const { state, reload, update } = useApiData(fetchGroups)
  const [creating, setCreating] = useState(false)

  const groups = state.status === 'ready' ? state.data : null
  const description =
    groups === null
      ? 'Grupy, które prowadzisz. Każda ma własną listę studentów, punkty i rangi.'
      : groups.length === 0
        ? 'Nie prowadzisz jeszcze żadnej grupy. Każda ma własną listę studentów, punkty i rangi.'
        : `Prowadzisz ${groups.length} ${plural(groups.length, 'grupę', 'grupy', 'grup')}. Każda ma własną listę studentów, punkty i rangi.`

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Moje grupy"
        description={description}
        actions={
          <Button variant="primary" aria-haspopup="dialog" onClick={() => setCreating(true)}>
            <PlusIcon className="size-4" />
            Nowa grupa
          </Button>
        }
      />

      <GroupsList state={state} onRetry={reload} onCreate={() => setCreating(true)} />

      <NewGroupDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={(group) =>
          update((current) =>
            [...current, group].sort((a, b) => a.name.localeCompare(b.name, 'pl')),
          )
        }
      />
    </div>
  )
}

function GroupsList({
  state,
  onRetry,
  onCreate,
}: {
  state: LoadState<GroupSummary[]>
  onRetry: () => void
  onCreate: () => void
}) {
  if (state.status === 'loading') {
    return (
      <LoadingState label="Ładowanie grup…" className={CARD_GRID}>
        {[0, 1, 2].map((index) => (
          <div key={index} className="blask-panel flex flex-col">
            <Skeleton className="aspect-[5/2] w-full rounded-t-[15px] rounded-b-none" />
            <div className="flex flex-col gap-3 p-5">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2" />
            </div>
          </div>
        ))}
      </LoadingState>
    )
  }
  if (state.status === 'error') {
    return (
      <BlaskNotice tone="error" title="Nie udało się wczytać grup.">
        <p className="text-sm">{apiErrorMessage(state.error)}</p>
        <Button variant="quiet" size="sm" className="self-start" onClick={onRetry}>
          Spróbuj ponownie
        </Button>
      </BlaskNotice>
    )
  }
  if (state.data.length === 0) {
    return (
      <EmptyState
        title="Nie masz jeszcze grup"
        icon={<PlusIcon className="size-5" />}
        action={
          <Button variant="primary" aria-haspopup="dialog" onClick={onCreate}>
            Utwórz pierwszą grupę
          </Button>
        }
      >
        <p>
          Utwórz grupę dla swoich zajęć, potem dodaj do niej studentów i ustaw punkty oraz rangi.
        </p>
      </EmptyState>
    )
  }
  return (
    <ul className={CARD_GRID} aria-label="Grupy">
      {state.data.map((group) => (
        <li key={group.id} className="flex">
          <GroupCard group={group} />
        </li>
      ))}
    </ul>
  )
}

/** A group as a card: its cover, its name (the link to the group) and plain facts under it. */
function GroupCard({ group }: { group: GroupSummary }) {
  return (
    <article className="blask-panel blask-group-card relative flex w-full flex-col">
      <GroupCover
        seed={group.id}
        className="aspect-[5/2] w-full [clip-path:inset(0_round_15px_15px_0_0)]"
      />
      <div className="flex flex-1 flex-col gap-2 p-5">
        <h2 className="text-[1.0625rem] leading-snug font-semibold text-blask-ink">
          <Link to={`/teacher/groups/${group.id}`} className="blask-group-open">
            {group.name}
          </Link>
        </h2>
        <p className="text-sm text-blask-graphite">
          <span className="blask-num font-semibold text-blask-ink">{group.studentCount}</span>{' '}
          {plural(group.studentCount, 'student', 'studentów', 'studentów')} w grupie
        </p>
        <p className="mt-auto pt-2 text-sm text-blask-graphite">
          Utworzona {dateFormat.format(new Date(group.createdAt))}
        </p>
      </div>
    </article>
  )
}

function NewGroupDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean
  onClose: () => void
  onCreated: (group: GroupSummary) => void
}) {
  const { notify } = useShell()
  const [name, setName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  function close() {
    setName('')
    setError(null)
    onClose()
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (saving) return
    const trimmed = name.trim()
    if (trimmed === '') {
      setError('Podaj nazwę grupy.')
      event.currentTarget.querySelector<HTMLInputElement>('input')?.focus()
      return
    }
    setError(null)
    setSaving(true)
    try {
      const group = await createGroup({ name: trimmed })
      onCreated(group)
      notify(`Utworzono grupę „${group.name}”.`)
      close()
    } catch (caught) {
      setError(apiErrorMessage(caught, CREATE_ERRORS))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={close}
      title="Nowa grupa"
      description="Wystarczy nazwa. Studentów, punkty i rangi ustawisz w grupie."
      busy={saving}
      onSubmit={handleSubmit}
      footer={
        <>
          <Button variant="quiet" disabled={saving} onClick={close}>
            Anuluj
          </Button>
          <Button variant="primary" type="submit" busy={saving} busyLabel="Tworzenie…">
            Utwórz grupę
          </Button>
        </>
      }
    >
      <TextField
        label="Nazwa grupy"
        placeholder="np. Inżynieria oprogramowania, grupa 1"
        value={name}
        maxLength={GROUP_NAME_MAX_LENGTH}
        counter={{ length: name.length, max: GROUP_NAME_MAX_LENGTH }}
        error={error}
        autoComplete="off"
        data-autofocus
        onChange={(event) => {
          setName(event.target.value)
          if (error !== null && event.target.value.trim() !== '') setError(null)
        }}
      />
    </Dialog>
  )
}
