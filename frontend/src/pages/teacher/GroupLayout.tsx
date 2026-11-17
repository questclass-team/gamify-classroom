import { useCallback } from 'react'
import { Link, Outlet, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { apiErrorMessage } from '../../api/errorMessage'
import { fetchGroup } from '../../api/groups'
import { useApiData } from '../../api/useApiData'
import { Alert, ErrorWithRetry, PageHeader } from '../../components/ui'
import { dateFormat } from '../../format'
import type { GroupOutletContext } from './groupContext'

/** `/teacher/groups/:groupId`: remounts per group so no data leaks between groups. */
export function GroupLayoutRoute() {
  const { groupId = '' } = useParams()
  return <GroupLayout key={groupId} groupId={groupId} />
}

function GroupLayout({ groupId }: { groupId: string }) {
  const load = useCallback((signal: AbortSignal) => fetchGroup(groupId, signal), [groupId])
  const { state, reload, update } = useApiData(load)
  const groupName = state.status === 'ready' ? state.data.name : 'Grupa'

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ścieżka" className="breadcrumbs -mb-2 text-sm">
        <ol>
          <li>
            <Link to="/teacher" className="text-muted underline underline-offset-2 hover:text-fg">
              Moje grupy
            </Link>
          </li>
          <li>
            <Link
              to={`/teacher/groups/${groupId}`}
              aria-current="page"
              className="truncate font-medium text-fg no-underline"
            >
              {groupName}
            </Link>
          </li>
        </ol>
      </nav>

      {state.status === 'loading' && <p className="text-muted">Ładowanie grupy…</p>}

      {state.status === 'error' &&
        (state.error instanceof ApiError && state.error.status === 404 ? (
          <Alert tone="error">
            Nie znaleziono grupy. Mogła zostać usunięta albo prowadzi ją inna osoba.{' '}
            <Link to="/teacher" className="font-medium underline underline-offset-2">
              Wróć do listy grup
            </Link>
          </Alert>
        ) : (
          <ErrorWithRetry message={apiErrorMessage(state.error)} onRetry={reload} />
        ))}

      {state.status === 'ready' && (
        <>
          <PageHeader
            title={state.data.name}
            description={`Studenci: ${state.data.students.length} · utworzona ${dateFormat.format(new Date(state.data.createdAt))}`}
          />
          <Outlet
            context={{ group: state.data, updateGroup: update } satisfies GroupOutletContext}
          />
        </>
      )}
    </div>
  )
}
