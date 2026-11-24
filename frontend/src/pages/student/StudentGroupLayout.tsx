import { Outlet, useParams } from 'react-router'
import { fetchMyGroups } from '../../api/student'
import { useApiData } from '../../api/useApiData'
import { LinkButton } from '../../components/blask/Button'
import { Breadcrumbs, RouteTabs } from '../../components/blask/Navigation'
import { PageHeader } from '../../components/blask/PageHeader'
import { LoadingState, Skeleton } from '../../components/blask/States'
import { dateFormat } from '../../format'
import type { StudentGroupOutletContext } from './studentGroupContext'
import { LoadError } from './StudentParts'

/** `/student/groups/:groupId`: remounts per group so no data leaks between groups. */
export function StudentGroupRoute() {
  const { groupId = '' } = useParams()
  return <StudentGroupLayout key={groupId} groupId={groupId} />
}

/**
 * A group of the student: the path back to Moje grupy, the group's name and teacher, and the
 * tabs Mój stan and Ranking. The group comes from the student's own groups, so one the student
 * is not in shows "Nie znaleziono grupy" without asking the game service.
 */
function StudentGroupLayout({ groupId }: { groupId: string }) {
  const { state, reload } = useApiData(fetchMyGroups)
  const group = state.status === 'ready' ? state.data.find((item) => item.id === groupId) : null
  const base = `/student/groups/${encodeURIComponent(groupId)}`

  return (
    <div className="flex flex-col gap-6">
      <Breadcrumbs
        items={[
          { label: 'Moje grupy', to: '/student' },
          {
            label: state.status === 'ready' ? (group?.name ?? 'Nie znaleziono grupy') : 'Grupa',
          },
        ]}
      />

      {state.status === 'loading' && (
        <LoadingState label="Ładowanie grupy…">
          <Skeleton className="h-10 w-2/3 max-w-xl" />
          <Skeleton className="h-4 w-64" />
        </LoadingState>
      )}

      {state.status === 'error' && (
        <>
          <h1 className="sr-only">Grupa</h1>
          <LoadError title="Nie udało się wczytać grupy." error={state.error} onRetry={reload} />
        </>
      )}

      {state.status === 'ready' && group === undefined && (
        <div className="flex flex-col items-start gap-4">
          <PageHeader
            title="Nie znaleziono grupy"
            description="Ta grupa nie istnieje albo nie należysz do niej. Jeśli prowadzący dopiero ma Cię dodać, po dodaniu zobaczysz ją w Moich grupach."
          />
          <LinkButton variant="primary" to="/student">
            Wróć do Moich grup
          </LinkButton>
        </div>
      )}

      {group != null && (
        <>
          <PageHeader
            title={group.name}
            description={`Prowadzi: ${group.teacherName}. W grupie od ${dateFormat.format(new Date(group.joinedAt))}.`}
          />
          <RouteTabs
            label="Sekcje grupy"
            tabs={[
              { to: base, label: 'Mój stan', end: true },
              { to: `${base}/ranking`, label: 'Ranking' },
            ]}
          />
          <Outlet context={{ group } satisfies StudentGroupOutletContext} />
        </>
      )}
    </div>
  )
}
