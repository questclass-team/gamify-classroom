import { useCallback, useEffect, useId, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { fetchGroupRanking } from '../../api/student'
import { RANKING_BY, type GroupRanking, type RankingBy, type RankingEntry } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { Avatar } from '../../components/blask/Avatar'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { Amount, type Currency } from '../../components/blask/CurrencyMark'
import { RankStar } from '../../components/blask/RankStar'
import { EmptyState, LoadingState, Skeleton } from '../../components/blask/States'
import { useStudentProfile } from '../../layout/studentProfile'
import {
  badgeCountText,
  isTied,
  myPlaceText,
  NO_NICKNAME,
  parseRankingBy,
  placeText,
  RANKING_BY_LABEL,
  rankingName,
} from './ranking'
import { useStudentGroup } from './studentGroupContext'
import { GroupNotFound, LoadError } from './StudentParts'

/** How many entries stand on the podium. */
const PODIUM = 3
/** The star over a podium place: the largest for the first place. */
const PODIUM_STAR = { 1: 3, 2: 2, 3: 1 } as const

/**
 * `/student/groups/:groupId/ranking?by=points|badges`: the lab's Tablica: everyone in the group by
 * nickname and avatar only, the first three on a podium of light and the others in a list below,
 * ordered by points or badges (the order lives in the URL). Equal results share a place.
 */
export function RankingPage() {
  const { group } = useStudentGroup()
  const { nickname, avatar, openNicknameDialog } = useStudentProfile()
  const [params, setParams] = useSearchParams()
  const by = parseRankingBy(params.get('by'))
  const load = useCallback(
    (signal: AbortSignal) => fetchGroupRanking(group.id, by, signal),
    [group.id, by],
  )
  const { state, reload } = useApiData(load)

  // A saved nickname or avatar changes the student's row (a nickname maybe the order among
  // equals): load again.
  const seenProfile = useRef({ nickname, avatar })
  useEffect(() => {
    const seen = seenProfile.current
    if (seen.nickname === nickname && seen.avatar === avatar) return
    const known = seen.nickname !== undefined || seen.avatar !== undefined
    seenProfile.current = { nickname, avatar }
    if (known) reload()
  }, [nickname, avatar, reload])

  const ranking = state.status === 'ready' ? state.data : null
  // While another order loads, the previous list stays, dimmed and marked busy.
  const stale = ranking !== null && ranking.by !== by

  if (state.status === 'error' && state.error instanceof ApiError && state.error.status === 404) {
    return <GroupNotFound />
  }

  return (
    <div className="flex flex-col gap-5">
      {nickname === null && (
        <BlaskNotice tone="info" title="Nie masz jeszcze nicku" announce={false}>
          <p className="text-sm">
            Tablica pokazuje tylko nicki, więc inni widzą Cię tu jako „{NO_NICKNAME}”. Ustaw nick, a
            pojawisz się pod nim.
          </p>
          <Button
            variant="outline"
            size="sm"
            className="mt-1 self-start"
            onClick={(event) => openNicknameDialog(event.currentTarget)}
          >
            Ustaw nick
          </Button>
        </BlaskNotice>
      )}

      <section aria-labelledby="ranking-title" className="blask-panel @container">
        <div className="blask-panel-head flex-wrap gap-y-3">
          <div className="flex min-w-0 flex-col">
            <h2 id="ranking-title" className="blask-panel-title">
              Tablica
            </h2>
            <p className="text-sm text-blask-graphite">
              Tylko nicki, bez imion i loginów. Równe wyniki dzielą miejsce.
            </p>
          </div>
          <OrderSwitch
            value={by}
            onChange={(next) => setParams(next === 'points' ? {} : { by: next }, { replace: true })}
          />
        </div>

        {state.status === 'loading' && (
          <LoadingState label="Ładowanie tablicy…" className="flex flex-col gap-5 p-5 sm:p-6">
            <div className="mx-auto grid w-full max-w-3xl grid-cols-3 items-end gap-3 sm:gap-5">
              {['h-24', 'h-32', 'h-20'].map((height) => (
                <Skeleton key={height} className={`${height} rounded-t-2xl rounded-b-none`} />
              ))}
            </div>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-9" />
            ))}
          </LoadingState>
        )}

        {state.status === 'error' && (
          <div className="p-5 sm:px-6">
            <LoadError
              title="Nie udało się wczytać tablicy."
              error={state.error}
              onRetry={reload}
            />
          </div>
        )}
        {ranking !== null && <Board ranking={ranking} by={by} stale={stale} />}
      </section>
    </div>
  )
}

/** "Punkty" / "Odznaki" as a segmented control on native radios (arrow keys move the choice). */
function OrderSwitch({ value, onChange }: { value: RankingBy; onChange: (by: RankingBy) => void }) {
  const name = useId()
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Kolejność tablicy</legend>
      <span aria-hidden="true" className="text-sm text-blask-graphite max-sm:hidden">
        Według
      </span>
      <div className="blask-seg">
        {RANKING_BY.map((by) => (
          <label key={by}>
            <input
              type="radio"
              name={name}
              value={by}
              checked={value === by}
              onChange={() => onChange(by)}
            />
            {RANKING_BY_LABEL[by]}
          </label>
        ))}
      </div>
    </fieldset>
  )
}

function Board({ ranking, by, stale }: { ranking: GroupRanking; by: RankingBy; stale: boolean }) {
  const currency: Currency = { name: ranking.currencyName, iconUrl: ranking.currencyIconUrl }
  const place = myPlaceText(ranking)
  // While stale, the board still shows the previous order: label it by what it shows.
  const shownBy = stale ? ranking.by : by
  const podium = ranking.entries.slice(0, PODIUM)
  const rest = ranking.entries.slice(PODIUM)

  if (ranking.entries.length === 0) {
    return (
      <EmptyState title="Tablica jest jeszcze pusta" headingLevel={3} bare>
        <p>Gdy prowadzący doda studentów do grupy, pojawią się tutaj pod swoimi nickami.</p>
      </EmptyState>
    )
  }

  return (
    <div
      aria-busy={stale || undefined}
      className={`transition-opacity duration-300 ${stale ? 'opacity-55' : ''}`}
    >
      {place !== null && (
        <p role="status" className="border-b border-(--blask-divider) px-5 py-3 sm:px-6">
          {place}
        </p>
      )}

      <ol
        aria-label={`Podium, według: ${RANKING_BY_LABEL[shownBy]}`}
        className="mx-auto grid max-w-3xl grid-cols-3 items-end gap-2 px-3 pt-6 sm:gap-5 sm:px-6"
      >
        {podium.map((entry, index) => (
          <PodiumPlace
            key={`${entry.position}-${index}`}
            entry={entry}
            // Second place on the left, the first in the middle, the third on the right.
            column={index === 0 ? 'col-start-2' : index === 1 ? 'col-start-1' : 'col-start-3'}
            tied={isTied(ranking.entries, entry)}
            currency={currency}
            by={shownBy}
          />
        ))}
      </ol>

      {rest.length > 0 && (
        <div className="border-t border-(--blask-divider)">
          <div
            aria-hidden="true"
            className="hidden grid-cols-[3rem_minmax(0,1fr)_9rem_8rem_7rem] gap-3 px-6 pt-3 pb-1 text-[0.8125rem] font-medium text-blask-graphite @min-[44rem]:grid"
          >
            <span>Miejsce</span>
            <span>Nick</span>
            <span>Ranga</span>
            <span className="text-right">{ranking.currencyName}</span>
            <span className="text-right">Odznaki</span>
          </div>
          <ol
            aria-label={`Dalsze miejsca, według: ${RANKING_BY_LABEL[shownBy]}`}
            className="flex flex-col p-2 sm:p-3"
          >
            {rest.map((entry, index) => (
              <RankingRow
                key={`${entry.position}-${index}`}
                entry={entry}
                tied={isTied(ranking.entries, entry)}
                currency={currency}
                by={shownBy}
              />
            ))}
          </ol>
        </div>
      )}
    </div>
  )
}

function Nickname({ entry }: { entry: RankingEntry }) {
  return (
    <>
      <span
        className={`${entry.isMe ? 'font-semibold' : ''} ${entry.nickname === null ? 'text-blask-graphite italic' : ''}`}
      >
        {rankingName(entry)}
      </span>
      {entry.isMe && (
        <span className="ml-2 text-sm font-medium whitespace-nowrap text-blask-cobalt-deep not-italic">
          to Ty
        </span>
      )}
    </>
  )
}

function PodiumPlace({
  entry,
  column,
  tied,
  currency,
  by,
}: {
  entry: RankingEntry
  column: string
  tied: boolean
  currency: Currency
  by: RankingBy
}) {
  const step = Math.min(PODIUM, entry.position) as 1 | 2 | 3
  return (
    <li
      aria-current={entry.isMe || undefined}
      className={`row-start-1 flex min-w-0 flex-col items-center gap-2 text-center ${column}`}
    >
      <span className="sr-only">{placeText(entry.position, tied)}: </span>
      <RankStar level={PODIUM_STAR[step]} size={step === 1 ? 56 : 44} twinkle={step === 1} />
      <Avatar avatar={entry.avatar} size={step === 1 ? 64 : 48} />
      <p className="w-full min-w-0 px-1 text-[0.9375rem] leading-snug font-semibold break-words sm:text-base">
        <Nickname entry={entry} />
      </p>
      <p className="flex flex-col items-center gap-0.5 text-sm">
        <Amount
          value={entry.balance}
          currency={currency}
          className={
            by === 'points' ? 'text-base font-semibold text-blask-ink' : 'text-blask-graphite'
          }
        />
        <span
          className={`blask-num ${by === 'badges' ? 'text-base font-semibold text-blask-ink' : 'text-blask-graphite'}`}
        >
          {badgeCountText(entry.badgeCount)}
        </span>
        <span className="text-blask-graphite max-sm:hidden">
          <span className="sr-only">Ranga: </span>
          {entry.rank?.name ?? 'Bez rangi'}
        </span>
      </p>
      <span aria-hidden="true" className="blask-podium-step mt-1 w-full" data-place={step}>
        {entry.position}
      </span>
    </li>
  )
}

function RankingRow({
  entry,
  tied,
  currency,
  by,
}: {
  entry: RankingEntry
  tied: boolean
  currency: Currency
  by: RankingBy
}) {
  return (
    <li
      aria-current={entry.isMe || undefined}
      className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 @min-[44rem]:grid-cols-[3rem_minmax(0,1fr)_9rem_8rem_7rem] ${
        entry.isMe ? 'bg-blask-peri-soft' : ''
      }`}
    >
      <span className="blask-place @max-[44rem]:row-span-2">
        <span aria-hidden="true">{entry.position}</span>
        <span className="sr-only">{placeText(entry.position, tied)}</span>
      </span>
      <span className="flex min-w-0 items-center gap-2.5">
        <Avatar avatar={entry.avatar} size={32} />
        <span className="min-w-0 truncate">
          <Nickname entry={entry} />
        </span>
      </span>
      <span className="text-sm text-blask-graphite @max-[44rem]:col-start-2 @max-[44rem]:row-start-2 @min-[44rem]:text-[0.9375rem] @min-[44rem]:text-blask-ink">
        <span className="sr-only">Ranga: </span>
        {entry.rank?.name ?? 'Bez rangi'}
      </span>
      <span
        className={`text-right @max-[44rem]:col-start-3 @max-[44rem]:row-start-1 ${by === 'points' ? 'font-semibold' : ''}`}
      >
        <Amount value={entry.balance} currency={currency} className="justify-end" />
      </span>
      <span
        className={`blask-num text-right text-sm @max-[44rem]:col-start-3 @max-[44rem]:row-start-2 @min-[44rem]:text-[0.9375rem] ${by === 'badges' ? 'font-semibold text-blask-ink' : 'text-blask-graphite'}`}
      >
        {badgeCountText(entry.badgeCount)}
      </span>
    </li>
  )
}
