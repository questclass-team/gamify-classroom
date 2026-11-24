import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { mapLimited } from '../../api/mapLimited'
import { fetchMyGroupState, fetchMyGroups } from '../../api/student'
import type { MyGroup, StudentGroupState } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { Amount } from '../../components/blask/CurrencyMark'
import { rankProgress } from '../../components/blask/ranks'
import { RankStar } from '../../components/blask/RankStar'
import { plural } from '../../format'
import { knownRanks, knownStarLevels, nextRankText } from './progress'
import { badgeCountText } from './ranking'
import { LoadError } from './StudentParts'

/** Group states are fetched per group; this many at once. */
const STATE_CONCURRENCY = 3
const MAX_BADGE_MARKS = 4

type CardState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: StudentGroupState }

/** `/student`: one card per group with the student's balance, rank and progress there. */
export function MyGroupsPage() {
  const { state, reload } = useApiData(fetchMyGroups)

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2">
        <h1 className="blask-page-title">Moje grupy</h1>
        <p className="max-w-[60ch] text-blask-graphite">
          {state.status === 'ready' && state.data.length > 0
            ? `Twój stan w ${state.data.length} ${plural(state.data.length, 'grupie', 'grupach', 'grupach')}: saldo, ranga i postęp do następnej rangi.`
            : 'Twój stan w każdej grupie: saldo, ranga i postęp do następnej rangi.'}
        </p>
      </header>

      {state.status === 'loading' && (
        <>
          <p role="status" className="sr-only">
            Ładowanie grup…
          </p>
          <ul aria-hidden="true" className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {[0, 1].map((index) => (
              <li key={index} className="blask-panel flex h-64 flex-col gap-4 p-6">
                <span className="blask-skeleton h-5 w-3/4" />
                <span className="blask-skeleton h-4 w-1/2" />
                <span className="blask-skeleton mt-auto h-10 w-2/5" />
              </li>
            ))}
          </ul>
        </>
      )}

      {state.status === 'error' && (
        <LoadError
          title="Nie udało się wczytać Twoich grup."
          error={state.error}
          onRetry={reload}
        />
      )}

      {state.status === 'ready' &&
        (state.data.length === 0 ? <NoGroups /> : <GroupCards groups={state.data} />)}
    </div>
  )
}

function NoGroups() {
  return (
    <section
      aria-labelledby="no-groups"
      className="blask-panel flex flex-col items-start gap-3 p-6 sm:p-8"
    >
      <h2 id="no-groups" className="text-xl font-semibold tracking-[-0.01em]">
        Nie należysz jeszcze do żadnej grupy
      </h2>
      <p className="max-w-[60ch] text-blask-graphite">
        Grupę zakłada prowadzący i to on dodaje do niej studentów. Poproś go o dodanie, a grupa
        pojawi się tutaj razem z Twoim saldem i rangą.
      </p>
    </section>
  )
}

function GroupCards({ groups }: { groups: MyGroup[] }) {
  const [states, setStates] = useState<Record<string, CardState>>({})
  const signalRef = useRef<AbortSignal | null>(null)

  /** Fetches the states a few at a time; each card fills in as soon as its answer arrives. */
  const load = useCallback(
    (ids: readonly string[], signal: AbortSignal) =>
      mapLimited(ids, STATE_CONCURRENCY, async (id) => {
        try {
          const data = await fetchMyGroupState(id, signal)
          setStates((current) => ({ ...current, [id]: { status: 'ready', data } }))
        } catch {
          if (!signal.aborted) setStates((current) => ({ ...current, [id]: { status: 'error' } }))
        }
      }),
    [],
  )

  useEffect(() => {
    const controller = new AbortController()
    signalRef.current = controller.signal
    void load(
      groups.map((group) => group.id),
      controller.signal,
    )
    return () => controller.abort()
  }, [groups, load])

  function retry(id: string) {
    if (signalRef.current === null) return
    setStates((current) => ({ ...current, [id]: { status: 'loading' } }))
    void load([id], signalRef.current)
  }

  return (
    <ul className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
      {groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          state={states[group.id] ?? { status: 'loading' }}
          onRetry={() => retry(group.id)}
        />
      ))}
    </ul>
  )
}

function GroupCard({
  group,
  state,
  onRetry,
}: {
  group: MyGroup
  state: CardState
  onRetry: () => void
}) {
  return (
    <li className="blask-panel blask-card relative flex flex-col gap-5 p-5 sm:p-6">
      <div className="flex flex-col gap-1">
        <h2 className="text-[1.125rem] leading-snug font-semibold tracking-[-0.01em]">
          <Link
            to={`/student/groups/${encodeURIComponent(group.id)}`}
            className="blask-card-link text-blask-ink no-underline"
          >
            {group.name}
          </Link>
        </h2>
        <p className="text-sm text-blask-graphite">Prowadzi: {group.teacherName}</p>
      </div>

      {state.status === 'loading' && (
        <div className="mt-auto flex flex-col gap-3">
          <span className="sr-only">Ładowanie stanu w grupie…</span>
          <span aria-hidden="true" className="blask-skeleton h-9 w-2/5" />
          <span aria-hidden="true" className="blask-skeleton h-1.5 w-full" />
          <span aria-hidden="true" className="blask-skeleton h-4 w-3/4" />
        </div>
      )}

      {state.status === 'error' && (
        <div className="relative z-10 mt-auto flex flex-col items-start gap-2">
          <p className="text-sm">Nie udało się wczytać Twojego stanu w tej grupie.</p>
          <button
            type="button"
            className="blask-btn blask-btn-sm blask-btn-quiet"
            onClick={onRetry}
          >
            Spróbuj ponownie
          </button>
        </div>
      )}

      {state.status === 'ready' && <GroupStanding data={state.data} />}
    </li>
  )
}

function GroupStanding({ data }: { data: StudentGroupState }) {
  const currency = { name: data.currencyName, iconUrl: data.currencyIconUrl }
  const progress = rankProgress(data.balance, knownRanks(data.rank, data.nextRank))
  const levels = knownStarLevels(data.rank, data.nextRank)
  const shown = data.badges.slice(0, MAX_BADGE_MARKS)

  return (
    <div className="mt-auto flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <p className="flex flex-col">
          <span className="text-sm text-blask-graphite">Saldo</span>
          <Amount
            value={data.balance}
            currency={currency}
            className="blask-display mt-1 h-9 text-[2.25rem] leading-none"
            markClassName="size-7"
          />
        </p>
        <p className="flex flex-col items-end">
          <span className="text-sm text-blask-graphite">Ranga</span>
          <span className="mt-1 inline-flex h-9 items-center gap-1.5 font-semibold">
            <RankStar level={levels.current} size={22} lit={data.rank !== null} />
            {data.rank?.name ?? 'Bez rangi'}
          </span>
        </p>
      </div>

      <div className="flex flex-col gap-2">
        {progress.count > 0 && (
          <div aria-hidden="true" className="blask-slim-track h-1.5 overflow-hidden rounded-full">
            <div
              className="blask-rank-fill h-full rounded-full"
              style={{ width: `${(progress.share * 100).toFixed(2)}%` }}
            />
          </div>
        )}
        <p className="text-sm text-blask-graphite">{nextRankText(data)}</p>
      </div>

      <div className="flex items-center gap-2 border-t border-[var(--blask-divider)] pt-3 text-sm text-blask-graphite">
        {shown.length > 0 && (
          <span aria-hidden="true" className="flex -space-x-1.5">
            {shown.map((award) => (
              <BadgeMark key={award.id} icon={award.badge.icon} size={24} />
            ))}
          </span>
        )}
        {data.badges.length === 0 ? 'Jeszcze bez odznak' : badgeCountText(data.badges.length)}
      </div>
    </div>
  )
}
