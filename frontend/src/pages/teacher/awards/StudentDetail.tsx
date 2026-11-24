import { mergeHistory } from '../../../api/awardHistory'
import { apiErrorMessage } from '../../../api/errorMessage'
import type { BadgeAward, GroupStudent, Rank, RankRef, RewardHistoryItem } from '../../../api/types'
import { BadgeMark } from '../../../components/blask/BadgeMark'
import { BlaskNotice } from '../../../components/blask/BlaskNotice'
import { Amount, CurrencyMark, type Currency } from '../../../components/blask/CurrencyMark'
import { UndoIcon } from '../../../components/blask/icons'
import { RankProgress } from '../../../components/blask/RankProgress'
import { dateFormat } from '../../../format'
import { historyMeta } from './awardHistory'

export type ProgressState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; balance: number; rank: RankRef | null }

export type DetailState =
  | { status: 'loading' }
  | { status: 'error'; error: unknown }
  | { status: 'ready'; rewards: RewardHistoryItem[]; badges: BadgeAward[] }

interface StudentDetailProps {
  id: string
  student: GroupStudent
  progress: ProgressState
  detail: DetailState
  currency: Currency
  ranks: readonly Rank[]
  currentUserId: string
  /** History keys added in this session; their nodes glow once. */
  freshKeys: ReadonlySet<string>
  /** Text of the last revocation for this student, shown above the badges. */
  revoked: string | null
  onRetry: () => void
  onRevoke: (award: BadgeAward) => void
}

/** One student's balance, rank progress, active badges (with revoke) and award history. */
export function StudentDetail({
  id,
  student,
  progress,
  detail,
  currency,
  ranks,
  currentUserId,
  freshKeys,
  revoked,
  onRetry,
  onRevoke,
}: StudentDetailProps) {
  return (
    <div
      id={id}
      role="region"
      aria-label={`Szczegóły: ${student.displayName}`}
      className="blask-pop @container mx-2 mb-3 rounded-2xl bg-blask-paper p-4 ring-1 ring-[var(--blask-divider)] sm:mx-3 sm:p-5"
    >
      <div className="grid gap-x-8 gap-y-6 @min-[40rem]:grid-cols-[minmax(0,17rem)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <div className="flex flex-col gap-3">
            <p className="flex flex-col">
              <span className="text-sm text-blask-graphite">Saldo</span>
              {progress.status === 'ready' ? (
                <span className="blask-display blask-num mt-1 flex items-center gap-2 text-[2.75rem] leading-none">
                  {progress.balance.toLocaleString('pl-PL')}
                  <CurrencyMark iconUrl={currency.iconUrl} className="size-8" />
                  <span className="sr-only">{currency.name}</span>
                </span>
              ) : progress.status === 'loading' ? (
                <>
                  <span aria-hidden="true" className="blask-skeleton mt-2 h-10 w-28" />
                  <span className="sr-only">Ładowanie salda…</span>
                </>
              ) : (
                <span className="mt-1 text-sm">Nie udało się wczytać salda.</span>
              )}
            </p>
            {progress.status === 'ready' && (
              <RankProgress balance={progress.balance} ranks={ranks} currency={currency} />
            )}
          </div>

          <section aria-labelledby={`${id}-badges`} className="flex flex-col gap-3">
            <h3
              id={`${id}-badges`}
              tabIndex={-1}
              className="flex items-baseline gap-2 text-[0.9375rem] font-semibold"
            >
              Odznaki
              {detail.status === 'ready' && (
                <span className="blask-num font-normal text-blask-graphite">
                  {detail.badges.length}
                </span>
              )}
            </h3>
            {revoked !== null && <BlaskNotice tone="success">{revoked}</BlaskNotice>}
            {detail.status === 'loading' && <SkeletonLines count={2} />}
            {detail.status === 'ready' &&
              (detail.badges.length === 0 ? (
                <p className="text-sm text-blask-graphite">Jeszcze bez odznak.</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {detail.badges.map((award) => (
                    <li
                      key={award.id}
                      className="flex items-center gap-3 rounded-xl bg-blask-white px-3 py-2.5 ring-1 ring-[var(--blask-divider)]"
                    >
                      <BadgeMark icon={award.badge.icon} size={32} />
                      <span className="flex min-w-0 flex-1 flex-col">
                        <span className="leading-snug font-semibold">{award.badge.name}</span>
                        <span className="text-[0.8125rem] text-blask-graphite">
                          od {dateFormat.format(new Date(award.createdAt))}
                        </span>
                      </span>
                      <button
                        type="button"
                        className="blask-btn blask-btn-sm blask-btn-quiet"
                        aria-label={`Cofnij odznakę „${award.badge.name}”: ${student.displayName}`}
                        onClick={() => onRevoke(award)}
                      >
                        <UndoIcon className="size-3.5" />
                        Cofnij
                      </button>
                    </li>
                  ))}
                </ul>
              ))}
          </section>
        </div>

        <section aria-labelledby={`${id}-history`} className="flex min-w-0 flex-col gap-3">
          <h3 id={`${id}-history`} className="text-[0.9375rem] font-semibold">
            Historia nagród
          </h3>
          {detail.status === 'loading' && <SkeletonLines count={4} />}
          {detail.status === 'error' && (
            <BlaskNotice tone="error" title="Nie udało się wczytać historii i odznak.">
              <p className="text-sm">{apiErrorMessage(detail.error)}</p>
              <button
                type="button"
                className="blask-btn blask-btn-sm blask-btn-quiet mt-1 self-start"
                onClick={onRetry}
              >
                Spróbuj ponownie
              </button>
            </BlaskNotice>
          )}
          {detail.status === 'ready' && (
            <History
              detail={detail}
              currency={currency}
              currentUserId={currentUserId}
              freshKeys={freshKeys}
            />
          )}
        </section>
      </div>
    </div>
  )
}

function History({
  detail,
  currency,
  currentUserId,
  freshKeys,
}: {
  detail: Extract<DetailState, { status: 'ready' }>
  currency: Currency
  currentUserId: string
  freshKeys: ReadonlySet<string>
}) {
  const entries = mergeHistory(detail.rewards, detail.badges)
  if (entries.length === 0) {
    return (
      <p className="text-sm text-blask-graphite">
        Brak nagród. Każda przyznana nagroda pojawi się tutaj z datą i uzasadnieniem.
      </p>
    )
  }
  return (
    <ol className="blask-ray flex flex-col">
      {entries.map((entry) => (
        <li
          key={entry.key}
          className="relative grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-3 py-2"
        >
          <span
            aria-hidden="true"
            className="blask-ray__node top-[0.9rem]"
            data-kind={entry.kind}
            data-fresh={freshKeys.has(entry.key)}
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
              {historyMeta(entry, currentUserId)}
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
            <span className="flex items-center gap-1.5 pt-px text-[0.8125rem] text-blask-graphite">
              <BadgeMark icon={entry.badge.icon} size={22} />
              bez punktów
            </span>
          )}
        </li>
      ))}
    </ol>
  )
}

/** Placeholder lines while the history loads; the text is for screen readers. */
function SkeletonLines({ count }: { count: number }) {
  return (
    <div className="flex flex-col gap-2.5">
      <span className="sr-only">Ładowanie…</span>
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="blask-skeleton h-4"
          style={{ width: `${88 - index * 14}%` }}
        />
      ))}
    </div>
  )
}
