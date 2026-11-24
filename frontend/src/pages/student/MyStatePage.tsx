import { useCallback } from 'react'
import { mergeHistory } from '../../api/awardHistory'
import { ApiError } from '../../api/client'
import { fetchMyGroupState } from '../../api/student'
import type { MyGroup, StudentGroupState } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { Amount, CurrencyMark, type Currency } from '../../components/blask/CurrencyMark'
import { useCountUp } from '../../components/blask/countUp'
import { RankProgress } from '../../components/blask/RankProgress'
import { RankStar } from '../../components/blask/RankStar'
import { dateFormat, dateTimeFormat } from '../../format'
import { useStudentProfile } from '../../layout/studentProfile'
import { knownRanks, knownStarLevels, nextRankText } from './progress'
import { badgeCountText, NO_NICKNAME } from './ranking'
import { useStudentGroup } from './studentGroupContext'
import { GroupNotFound, LoadError } from './StudentParts'

/** `/student/groups/:groupId`: balance, rank and progress, badges and award history. */
export function MyStatePage() {
  const { group } = useStudentGroup()
  const load = useCallback((signal: AbortSignal) => fetchMyGroupState(group.id, signal), [group.id])
  const { state, reload } = useApiData(load)

  if (state.status === 'loading') {
    return (
      <div className="grid gap-5">
        <p role="status" className="sr-only">
          Ładowanie Twojego stanu…
        </p>
        <div aria-hidden="true" className="blask-panel h-56" />
        <div aria-hidden="true" className="grid gap-5 lg:grid-cols-2">
          <div className="blask-panel h-64" />
          <div className="blask-panel h-64" />
        </div>
      </div>
    )
  }
  if (state.status === 'error') {
    if (state.error instanceof ApiError && state.error.status === 404) return <GroupNotFound />
    return (
      <LoadError
        title="Nie udało się wczytać Twojego stanu."
        error={state.error}
        onRetry={reload}
      />
    )
  }
  return <MyState group={group} data={state.data} />
}

function MyState({ group, data }: { group: MyGroup; data: StudentGroupState }) {
  const { nickname, openNicknameDialog } = useStudentProfile()
  const currency: Currency = { name: data.currencyName, iconUrl: data.currencyIconUrl }
  const shown = useCountUp(data.balance)
  // The header's profile follows saves at once; the state was read before them.
  const myNickname = nickname === undefined ? data.nickname : nickname

  return (
    <div className="flex flex-col gap-5">
      <section aria-labelledby="my-state-title" className="blask-panel @container">
        <h2 id="my-state-title" className="sr-only">
          Saldo i ranga
        </h2>
        <div className="grid gap-6 p-5 sm:p-6 @min-[44rem]:grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] @min-[44rem]:items-center @min-[44rem]:gap-0">
          <div className="flex items-center gap-4 @min-[44rem]:border-r @min-[44rem]:border-[var(--blask-divider)] @min-[44rem]:pr-8">
            <CurrencyMark iconUrl={currency.iconUrl} className="size-14 sm:size-16" />
            <p className="min-w-0">
              <span className="sr-only">
                Saldo: {data.balance.toLocaleString('pl-PL')} ({currency.name})
              </span>
              <span aria-hidden="true" className="block">
                <span className="block text-sm font-medium text-blask-graphite">
                  Saldo, {currency.name}
                </span>
                <span className="blask-balance-figure mt-1.5 block">
                  {shown.toLocaleString('pl-PL')}
                </span>
              </span>
            </p>
          </div>

          <div className="flex min-w-0 flex-col gap-4 @min-[44rem]:pl-8">
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-blask-graphite">
              Ranga
              <span className="inline-flex items-center gap-1.5">
                <RankStar
                  level={knownStarLevels(data.rank, data.nextRank).current}
                  size={26}
                  lit={data.rank !== null}
                />
                <span className="blask-display text-[1.5rem] leading-none font-semibold tracking-[-0.02em] text-blask-ink">
                  {data.rank?.name ?? 'Bez rangi'}
                </span>
              </span>
            </p>
            <RankProgress
              balance={data.balance}
              ranks={knownRanks(data.rank, data.nextRank)}
              currency={currency}
              text={nextRankText(data)}
              starLevels={knownStarLevels(data.rank, data.nextRank)}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-[var(--blask-divider)] px-5 py-3.5 text-[0.9375rem] sm:px-6">
          <p className="text-blask-graphite">
            {myNickname === null ? (
              <>W rankingu widać Cię jako „{NO_NICKNAME}”.</>
            ) : (
              <>
                W rankingu występujesz jako{' '}
                <strong className="font-semibold text-blask-ink">{myNickname}</strong>.
              </>
            )}
          </p>
          <button
            type="button"
            className="blask-btn blask-btn-sm blask-btn-quiet"
            onClick={(event) => openNicknameDialog(event.currentTarget)}
          >
            {myNickname === null ? 'Ustaw nick' : 'Zmień nick'}
          </button>
        </div>
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <section aria-labelledby="my-badges" className="blask-panel">
          <div className="blask-panel-head">
            <h2 id="my-badges" className="blask-panel-title">
              Odznaki
            </h2>
            <span className="text-sm text-blask-graphite">
              {badgeCountText(data.badges.length)}
            </span>
          </div>
          {data.badges.length === 0 ? (
            <p className="p-5 text-blask-graphite sm:px-6">
              Nie masz jeszcze odznak w tej grupie. Przyznaje je prowadzący, a każda pojawi się
              tutaj z opisem i datą.
            </p>
          ) : (
            <ul className="grid gap-2.5 p-4 sm:p-5">
              {data.badges.map((award) => (
                <li
                  key={award.id}
                  className="flex items-start gap-3 rounded-2xl bg-[linear-gradient(160deg,var(--color-blask-white),var(--color-blask-mist))] p-3 shadow-[inset_0_0_0_1px_var(--color-blask-haze)]"
                >
                  <BadgeMark icon={award.badge.icon} size={44} />
                  <div className="min-w-0">
                    <p className="leading-tight font-semibold">{award.badge.name}</p>
                    {award.badge.description !== '' && (
                      <p className="mt-0.5 text-[0.875rem] leading-snug text-blask-graphite">
                        {award.badge.description}
                      </p>
                    )}
                    <p className="mt-1 text-[0.8125rem] font-medium text-blask-graphite">
                      Zdobyta {dateFormat.format(new Date(award.createdAt))}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-labelledby="my-history" className="blask-panel">
          <div className="blask-panel-head">
            <h2 id="my-history" className="blask-panel-title">
              Historia nagród
            </h2>
          </div>
          <History data={data} currency={currency} teacherName={group.teacherName} />
        </section>
      </div>
    </div>
  )
}

/** Points and badges on one line of light, newest first; the giver is the group's teacher. */
function History({
  data,
  currency,
  teacherName,
}: {
  data: StudentGroupState
  currency: Currency
  teacherName: string
}) {
  const entries = mergeHistory(data.rewards, data.badges)
  if (entries.length === 0) {
    return (
      <p className="p-5 text-blask-graphite sm:px-6">
        Nie masz jeszcze nagród w tej grupie. Każda nagroda pojawi się tutaj z uzasadnieniem i datą.
      </p>
    )
  }
  return (
    <ol className="blask-ray mx-5 my-3 flex flex-col sm:mx-6">
      {entries.map((entry) => (
        <li
          key={entry.key}
          className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2.5"
        >
          <span
            aria-hidden="true"
            className="blask-ray__node top-[1.05rem]"
            data-kind={entry.kind}
          />
          <span className="flex min-w-0 flex-col">
            {entry.kind === 'points' ? (
              <span className="leading-snug font-medium">
                {entry.reason === '' ? 'Nagroda bez uzasadnienia' : entry.reason}
              </span>
            ) : (
              <span className="leading-snug font-medium">
                <span className="sr-only">Odznaka: </span>
                <span aria-hidden="true">Odznaka </span>„{entry.badge.name}”
              </span>
            )}
            <span className="text-[0.8125rem] text-blask-graphite">
              {teacherName}, {dateTimeFormat.format(new Date(entry.createdAt))}
            </span>
          </span>
          {entry.kind === 'points' ? (
            <Amount
              value={entry.points}
              currency={currency}
              signed
              className="pt-px font-semibold"
            />
          ) : (
            <span className="pt-px">
              <BadgeMark icon={entry.badge.icon} size={24} />
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}
