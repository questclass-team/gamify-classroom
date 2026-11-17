import { useCallback } from 'react'
import { Link, NavLink, Outlet, useParams } from 'react-router'
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
          <nav aria-label="Sekcje grupy" className="-mt-2 flex gap-1 border-b border-line">
            <GroupTab to={`/teacher/groups/${groupId}`} end>
              Studenci
            </GroupTab>
            <GroupTab to={`/teacher/groups/${groupId}/config`}>Punkty i rangi</GroupTab>
          </nav>
          <Outlet
            context={{ group: state.data, updateGroup: update } satisfies GroupOutletContext}
          />
        </>
      )}
    </div>
  )
}

/** Section link; NavLink sets aria-current="page" on the active one. */
function GroupTab({ to, end, children }: { to: string; end?: boolean; children: string }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="-mb-px border-b-2 border-transparent px-3 py-2 text-sm font-semibold text-muted transition-colors hover:text-fg focus-visible:outline-2 focus-visible:outline-focus aria-[current=page]:border-accent aria-[current=page]:text-fg"
    >
      {children}
    </NavLink>
  )
}
