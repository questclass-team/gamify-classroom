import { Link, NavLink, Outlet, useParams } from 'react-router'
import { fetchMyGroups } from '../../api/student'
import { useApiData } from '../../api/useApiData'
import { dateFormat } from '../../format'
import type { StudentGroupOutletContext } from './studentGroupContext'
import { GroupNotFound, LoadError } from './StudentParts'

/** `/student/groups/:groupId`: remounts per group so no data leaks between groups. */
export function StudentGroupRoute() {
  const { groupId = '' } = useParams()
  return <StudentGroupLayout key={groupId} groupId={groupId} />
}

/**
 * A group of the student: breadcrumb back to Moje grupy, the group's name and teacher, and the
 * tabs Mój stan and Ranking. The group comes from the student's own groups, so one the student
 * is not in shows "Nie znaleziono grupy" without asking the game service.
 */
function StudentGroupLayout({ groupId }: { groupId: string }) {
  const { state, reload } = useApiData(fetchMyGroups)
  const group = state.status === 'ready' ? state.data.find((item) => item.id === groupId) : null
  const base = `/student/groups/${encodeURIComponent(groupId)}`

  return (
    <div className="flex flex-col gap-6">
      <nav aria-label="Ścieżka" className="text-sm">
        <ol className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-blask-graphite">
          <li>
            <Link to="/student" className="text-blask-graphite underline hover:text-blask-ink">
              Moje grupy
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li className="min-w-0 truncate font-medium text-blask-ink">
            {state.status === 'ready' ? (group?.name ?? 'Nie znaleziono grupy') : 'Grupa'}
          </li>
        </ol>
      </nav>

      {state.status === 'loading' && (
        <div className="flex flex-col gap-3">
          <p role="status" className="sr-only">
            Ładowanie grupy…
          </p>
          <span aria-hidden="true" className="blask-skeleton h-10 w-2/3 max-w-xl" />
          <span aria-hidden="true" className="blask-skeleton h-4 w-56" />
        </div>
      )}

      {state.status === 'error' && (
        <LoadError title="Nie udało się wczytać grupy." error={state.error} onRetry={reload} />
      )}

      {state.status === 'ready' && group === undefined && <GroupNotFound />}

      {group != null && (
        <>
          <header className="flex flex-col gap-2">
            <h1 className="blask-page-title">{group.name}</h1>
            <p className="text-blask-graphite">
              Prowadzi: {group.teacherName}. Jesteś w grupie od{' '}
              {dateFormat.format(new Date(group.joinedAt))}.
            </p>
          </header>
          <nav aria-label="Sekcje grupy" className="blask-tabs">
            <NavLink to={base} end className="blask-tab">
              Mój stan
            </NavLink>
            <NavLink to={`${base}/ranking`} className="blask-tab">
              Ranking
            </NavLink>
          </nav>
          <Outlet context={{ group } satisfies StudentGroupOutletContext} />
        </>
      )}
    </div>
  )
}
