import { useCallback } from 'react'
import { Outlet, useParams } from 'react-router'
import { ApiError } from '../../api/client'
import { apiErrorMessage } from '../../api/errorMessage'
import { fetchGroup } from '../../api/groups'
import { useApiData } from '../../api/useApiData'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button, LinkButton } from '../../components/blask/Button'
import { Breadcrumbs, RouteTabs } from '../../components/blask/Navigation'
import { PageHeader } from '../../components/blask/PageHeader'
import { EmptyState, LoadingState, Skeleton } from '../../components/blask/States'
import { dateFormat, plural } from '../../format'
import type { GroupOutletContext } from './groupContext'

/** `/teacher/groups/:groupId`: remounts per group so no data leaks between groups. */
export function GroupLayoutRoute() {
  const { groupId = '' } = useParams()
  return <GroupLayout key={groupId} groupId={groupId} />
}

function GroupLayout({ groupId }: { groupId: string }) {
  const load = useCallback((signal: AbortSignal) => fetchGroup(groupId, signal), [groupId])
  const { state, reload, update } = useApiData(load)
  const base = `/teacher/groups/${groupId}`

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Moje grupy', to: '/teacher' },
          { label: state.status === 'ready' ? state.data.name : 'Grupa' },
        ]}
      />

      {state.status === 'loading' && (
        <LoadingState label="Ładowanie grupy…" className="flex flex-col gap-4">
          <Skeleton className="h-10 w-72 max-w-full" />
          <Skeleton className="h-5 w-96 max-w-full" />
          <Skeleton className="mt-2 h-11 w-80 max-w-full" />
        </LoadingState>
      )}

      {state.status === 'error' &&
        (state.error instanceof ApiError && state.error.status === 404 ? (
          <EmptyState
            title="Nie znaleziono grupy"
            action={
              <LinkButton variant="primary" to="/teacher">
                Wróć do listy grup
              </LinkButton>
            }
          >
            <p>Mogła zostać usunięta albo prowadzi ją inna osoba.</p>
          </EmptyState>
        ) : (
          <BlaskNotice tone="error" title="Nie udało się wczytać grupy.">
            <p className="text-sm">{apiErrorMessage(state.error)}</p>
            <Button variant="quiet" size="sm" className="self-start" onClick={reload}>
              Spróbuj ponownie
            </Button>
          </BlaskNotice>
        ))}

      {state.status === 'ready' && (
        <>
          <PageHeader title={state.data.name} description={summary(state.data)} />
          <RouteTabs
            label="Sekcje grupy"
            tabs={[
              { to: base, label: 'Studenci', end: true },
              { to: `${base}/awards`, label: 'Nagrody' },
              { to: `${base}/config`, label: 'Punkty i rangi' },
            ]}
          />
          <Outlet
            context={{ group: state.data, updateGroup: update } satisfies GroupOutletContext}
          />
        </>
      )}
    </div>
  )
}

/** One plain sentence about the group: how many students and since when. */
function summary(group: GroupOutletContext['group']) {
  const count = group.students.length
  const created = dateFormat.format(new Date(group.createdAt))
  if (count === 0) return `Grupa utworzona ${created}, na razie bez studentów.`
  return `${count} ${plural(count, 'student', 'studentów', 'studentów')} w grupie utworzonej ${created}.`
}
