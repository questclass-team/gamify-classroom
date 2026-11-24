import { useCallback, useEffect, useId, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { ApiError } from '../../api/client'
import { fetchGroupRanking } from '../../api/student'
import { RANKING_BY, type GroupRanking, type RankingBy } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Amount, type Currency } from '../../components/blask/CurrencyMark'
import { useStudentProfile } from '../../layout/studentProfile'
import {
  badgeCountText,
  isPodium,
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

/**
 * `/student/groups/:groupId/ranking?by=points|badges`: everyone in the group by nickname only,
 * ordered by points or badges (the order lives in the URL).
 */
export function RankingPage() {
  const { group } = useStudentGroup()
  const { nickname, openNicknameDialog } = useStudentProfile()
  const [params, setParams] = useSearchParams()
  const by = parseRankingBy(params.get('by'))
  const load = useCallback(
    (signal: AbortSignal) => fetchGroupRanking(group.id, by, signal),
    [group.id, by],
  )
  const { state, reload } = useApiData(load)

  // A saved nickname changes the student's row (and maybe the order among equals): load again.
  const seenNickname = useRef(nickname)
  useEffect(() => {
    if (seenNickname.current === nickname) return
    const known = seenNickname.current !== undefined
    seenNickname.current = nickname
    if (known) reload()
  }, [nickname, reload])

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
            Ranking pokazuje tylko nicki, więc inni widzą Cię tu jako „{NO_NICKNAME}”. Ustaw nick, a
            pojawisz się pod nim.
          </p>
          <button
            type="button"
            className="blask-btn blask-btn-sm blask-btn-primary mt-1 self-start"
            onClick={(event) => openNicknameDialog(event.currentTarget)}
          >
            Ustaw nick
          </button>
        </BlaskNotice>
      )}

      <section aria-labelledby="ranking-title" className="blask-panel">
        <div className="blask-panel-head">
          <div className="flex min-w-0 flex-col">
            <h2 id="ranking-title" className="blask-panel-title">
              Ranking grupy
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
          <div className="flex flex-col gap-3 p-5 sm:px-6">
            <p role="status" className="sr-only">
              Ładowanie rankingu…
            </p>
            {[0, 1, 2, 3].map((index) => (
              <span
                key={index}
                aria-hidden="true"
                className="blask-skeleton h-9"
                style={{ width: `${96 - index * 9}%` }}
              />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <div className="p-5 sm:px-6">
            <LoadError
              title="Nie udało się wczytać rankingu."
              error={state.error}
              onRetry={reload}
            />
          </div>
        )}
        {ranking !== null && <RankingList ranking={ranking} by={by} stale={stale} />}
      </section>
    </div>
  )
}

/** "Punkty" / "Odznaki" as a segmented control on native radios (arrow keys move the choice). */
function OrderSwitch({ value, onChange }: { value: RankingBy; onChange: (by: RankingBy) => void }) {
  const name = useId()
  return (
    <fieldset className="flex items-center gap-2">
      <legend className="sr-only">Kolejność rankingu</legend>
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

function RankingList({
  ranking,
  by,
  stale,
}: {
  ranking: GroupRanking
  by: RankingBy
  stale: boolean
}) {
  const currency: Currency = { name: ranking.currencyName, iconUrl: ranking.currencyIconUrl }
  const place = myPlaceText(ranking)
  // While stale, the list still shows the previous order: label it by what it shows.
  const shownBy = stale ? ranking.by : by

  return (
    <div
      aria-busy={stale || undefined}
      className={`transition-opacity duration-300 ${stale ? 'opacity-55' : ''}`}
    >
      {place !== null && (
        <p role="status" className="border-b border-[var(--blask-divider)] px-5 py-3 sm:px-6">
          {place}
        </p>
      )}
      <div
        aria-hidden="true"
        className="hidden grid-cols-[3rem_minmax(0,1fr)_9rem_8rem_7rem] gap-3 px-5 pt-3 pb-1 text-[0.8125rem] font-medium text-blask-graphite sm:px-6 md:grid"
      >
        <span>Miejsce</span>
        <span>Nick</span>
        <span>Ranga</span>
        <span className="text-right">{ranking.currencyName}</span>
        <span className="text-right">Odznaki</span>
      </div>
      <ol
        aria-label={`Ranking według: ${RANKING_BY_LABEL[shownBy]}`}
        className="flex flex-col p-2 sm:p-3"
      >
        {ranking.entries.map((entry, index) => {
          const tied = isTied(ranking.entries, entry)
          return (
            <li
              key={`${entry.position}-${index}`}
              aria-current={entry.isMe || undefined}
              className={`grid grid-cols-[2.75rem_minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 rounded-xl px-3 py-2.5 md:grid-cols-[3rem_minmax(0,1fr)_9rem_8rem_7rem] ${
                entry.isMe
                  ? 'bg-blask-peri-soft shadow-[inset_0_0_0_1px_var(--color-blask-haze)]'
                  : ''
              }`}
            >
              <span
                className="blask-place max-md:row-span-2"
                data-podium={isPodium(entry.position)}
                data-first={entry.position === 1}
              >
                <span aria-hidden="true">{entry.position}</span>
                <span className="sr-only">{placeText(entry.position, tied)}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <span
                  className={`truncate ${entry.isMe ? 'font-semibold' : ''} ${entry.nickname === null ? 'text-blask-graphite italic' : ''}`}
                >
                  {rankingName(entry)}
                </span>
                {entry.isMe && (
                  <span className="blask-chip flex-none bg-blask-white text-blask-cobalt-deep shadow-[inset_0_0_0_1px_var(--color-blask-lavender)]">
                    Ty
                  </span>
                )}
              </span>
              <span className="text-sm text-blask-graphite max-md:col-start-2 max-md:row-start-2 md:text-[0.9375rem] md:text-blask-ink">
                <span className="sr-only">Ranga: </span>
                {entry.rank?.name ?? 'Bez rangi'}
              </span>
              <span
                className={`text-right max-md:col-start-3 max-md:row-start-1 ${shownBy === 'points' ? 'font-semibold' : ''}`}
              >
                <Amount value={entry.balance} currency={currency} className="justify-end" />
              </span>
              <span
                className={`blask-num text-right text-sm max-md:col-start-3 max-md:row-start-2 md:text-[0.9375rem] ${shownBy === 'badges' ? 'font-semibold text-blask-ink' : 'text-blask-graphite'}`}
              >
                {badgeCountText(entry.badgeCount)}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}
