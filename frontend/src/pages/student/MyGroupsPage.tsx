import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { mapLimited } from '../../api/mapLimited'
import { fetchMyGroupState, fetchMyGroups } from '../../api/student'
import type { MyGroup, StudentGroupState } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { Button } from '../../components/blask/Button'
import { Amount } from '../../components/blask/CurrencyMark'
import { GroupCover } from '../../components/blask/GroupCover'
import { UsersIcon } from '../../components/blask/icons'
import { PageHeader } from '../../components/blask/PageHeader'
import { rankProgress } from '../../components/blask/ranks'
import { RankStar } from '../../components/blask/RankStar'
import { EmptyState, LoadingState, Skeleton } from '../../components/blask/States'
import { plural } from '../../format'
import { knownRanks, knownStarLevels, nextRankText } from './progress'
import { badgeCountText } from './ranking'
import { LoadError } from './StudentParts'

/** Group states are fetched per group; this many at once. */
const STATE_CONCURRENCY = 3
const MAX_BADGE_MARKS = 4
/** The lab's card grid (Moje kursy): as many ~19rem columns as fit. */
const CARD_GRID = 'grid gap-5 grid-cols-[repeat(auto-fill,minmax(min(100%,18.75rem),1fr))]'

type CardState =
  { status: 'loading' } | { status: 'error' } | { status: 'ready'; data: StudentGroupState }

/** `/student`: the lab's Moje kursy cards, one per group, with the student's standing there. */
export function MyGroupsPage() {
  const { state, reload } = useApiData(fetchMyGroups)
  const count = state.status === 'ready' ? state.data.length : null

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Moje grupy"
        description={
          count !== null && count > 0
            ? `Twój stan w ${count} ${plural(count, 'grupie', 'grupach', 'grupach')}: saldo, ranga, postęp do następnej rangi i odznaki.`
            : 'Twój stan w każdej grupie: saldo, ranga, postęp do następnej rangi i odznaki.'
        }
      />

      {state.status === 'loading' && (
        <LoadingState label="Ładowanie grup…" className={CARD_GRID}>
          {[0, 1].map((index) => (
            <div key={index} className="blask-panel flex flex-col overflow-hidden">
              <Skeleton className="aspect-[5/2] w-full rounded-none" />
              <div className="flex flex-col gap-3 p-5">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="mt-6 h-12 w-full rounded-xl" />
                <Skeleton className="h-1.5 w-full" />
              </div>
            </div>
          ))}
        </LoadingState>
      )}

      {state.status === 'error' && (
        <LoadError
          title="Nie udało się wczytać Twoich grup."
          error={state.error}
          onRetry={reload}
        />
      )}

      {state.status === 'ready' &&
        (state.data.length === 0 ? (
          <EmptyState
            title="Nie należysz jeszcze do żadnej grupy"
            icon={<UsersIcon className="size-6" />}
          >
            <p>
              Grupę zakłada prowadzący i to on dodaje do niej studentów. Poproś go o dodanie, a
              grupa pojawi się tutaj razem z Twoim saldem i rangą.
            </p>
          </EmptyState>
        ) : (
          <GroupCards groups={state.data} />
        ))}
    </div>
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
    <ul className={CARD_GRID}>
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
  const progress =
    state.status === 'ready'
      ? rankProgress(state.data.balance, knownRanks(state.data.rank, state.data.nextRank))
      : null

  return (
    <li className="blask-panel blask-group-card relative flex flex-col">
      <GroupCover
        seed={group.id}
        progress={progress !== null && progress.count > 0 ? progress.share : undefined}
        className="aspect-[5/2] w-full [clip-path:inset(0_round_15px_15px_0_0)]"
      />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="grid min-w-0 gap-1">
          <h2 className="text-[1.0625rem] leading-snug font-semibold text-blask-ink">
            <Link
              to={`/student/groups/${encodeURIComponent(group.id)}`}
              className="blask-group-card__link text-blask-ink no-underline"
            >
              {group.name}
            </Link>
          </h2>
          <p className="text-sm text-blask-graphite">Prowadzi: {group.teacherName}</p>
        </div>

        <div className="mt-auto grid gap-3 pt-1">
          {state.status === 'loading' && (
            <>
              <span className="sr-only">Ładowanie stanu w grupie…</span>
              <Skeleton className="h-11 w-full rounded-xl" />
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-1.5 w-full" />
            </>
          )}

          {state.status === 'error' && (
            <div className="relative z-10 flex flex-col items-start gap-2">
              <p className="text-sm">Nie udało się wczytać Twojego stanu w tej grupie.</p>
              <Button variant="outline" size="sm" onClick={onRetry}>
                Spróbuj ponownie
              </Button>
            </div>
          )}

          {state.status === 'ready' && <GroupStanding data={state.data} />}
        </div>
      </div>
    </li>
  )
}

function GroupStanding({ data }: { data: StudentGroupState }) {
  const currency = { name: data.currencyName, iconUrl: data.currencyIconUrl }
  const progress = rankProgress(data.balance, knownRanks(data.rank, data.nextRank))
  const levels = knownStarLevels(data.rank, data.nextRank)
  const marks = data.badges.slice(0, MAX_BADGE_MARKS)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-[12px] bg-blask-mist px-3 py-2 text-sm shadow-[inset_0_0_0_1px_var(--color-blask-haze)]">
        <span className="flex flex-wrap items-center gap-2">
          <span className="sr-only">Saldo: </span>
          <Amount
            value={data.balance}
            currency={currency}
            className="text-[0.9375rem] font-semibold"
            markClassName="size-[18px]"
          />
          {progress.count > 0 && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blask-white py-0.5 pr-2.5 pl-1 text-blask-ink shadow-[inset_0_0_0_1px_var(--color-blask-haze)]">
              <RankStar level={levels.current} size={18} lit={data.rank !== null} />
              <span className="sr-only">Ranga: </span>
              {data.rank?.name ?? 'Bez rangi'}
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5 text-blask-graphite">
          {marks.length > 0 && (
            <span aria-hidden="true" className="flex -space-x-1.5">
              {marks.map((award) => (
                <BadgeMark key={award.id} icon={award.badge.icon} size={20} />
              ))}
            </span>
          )}
          {data.badges.length === 0 ? 'bez odznak' : badgeCountText(data.badges.length)}
        </span>
      </div>
      <div>
        <span className="text-sm text-blask-graphite">{nextRankText(data)}</span>
        {progress.count > 0 && (
          <div
            aria-hidden="true"
            className="blask-slim-track mt-1.5 h-1.5 overflow-hidden rounded-full"
          >
            <div
              className="blask-rank-fill h-full rounded-full"
              style={{ width: `${(progress.share * 100).toFixed(2)}%` }}
            />
          </div>
        )}
      </div>
    </>
  )
}
