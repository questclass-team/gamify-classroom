import type { RankRef } from '../../api/types'
import type { Currency } from '../../components/blask/CurrencyMark'
import { RankStar } from '../../components/blask/RankStar'
import { rankProgress } from '../../components/blask/ranks'
import { knownRanks, knownStarLevels, nextRankText } from './progress'

const STAR = 40

/**
 * The Panel's rank line, as in the lab: the current rank's star breathing on the left, the next
 * one dim on the right, the line of light between them lit up to the balance and ending in a pearl
 * point; each star's name and threshold under it. The student only learns the current and the
 * next rank, so the line spans those two. At the top rank the whole line is lit into its star;
 * below the first rank it starts from a dim spark at 0. A progressbar with the same words.
 */
export function RankLine({
  balance,
  rank,
  nextRank,
  currency,
}: {
  balance: number
  rank: RankRef | null
  nextRank: RankRef | null
  currency: Currency
}) {
  const progress = rankProgress(balance, knownRanks(rank, nextRank))
  const levels = knownStarLevels(rank, nextRank)
  const text = nextRankText({ balance, rank, nextRank, currencyName: currency.name })
  const percent = `${(progress.share * 100).toFixed(2)}%`
  const top = nextRank === null

  return (
    <div
      role="progressbar"
      aria-label={top ? `Ranga ${rank?.name ?? ''}` : `Postęp do rangi ${nextRank.name}`}
      aria-valuemin={rank?.threshold ?? 0}
      aria-valuemax={nextRank?.threshold ?? rank?.threshold ?? 0}
      aria-valuenow={balance}
      aria-valuetext={
        top
          ? `${balance.toLocaleString('pl-PL')} (${currency.name}), najwyższa ranga`
          : `${balance.toLocaleString('pl-PL')} z ${nextRank.threshold.toLocaleString('pl-PL')} (${currency.name}). ${text}`
      }
    >
      <div aria-hidden="true" className="flex items-center gap-1.5">
        {!top && (
          <span className="blask-rankline-star grid flex-none place-items-center">
            <RankStar level={levels.current} size={STAR} lit={rank !== null} twinkle />
          </span>
        )}
        <div className="relative h-3 min-w-0 flex-1">
          <span className="blask-rank-track absolute inset-x-0 top-1/2 h-px -translate-y-1/2" />
          <span
            className="blask-rank-fill absolute top-1/2 left-0 h-[2px] origin-left -translate-y-1/2 rounded-full"
            style={{ width: top ? '100%' : percent }}
          />
          {!top && (
            <span
              className="blask-rank-head absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: percent }}
            />
          )}
        </div>
        <span className="blask-rankline-star grid flex-none place-items-center">
          <RankStar
            level={top ? levels.current : levels.next}
            size={STAR}
            lit={top}
            twinkle={top}
          />
        </span>
      </div>
      <div
        aria-hidden="true"
        className="mt-2 flex justify-between gap-4 text-[0.8125rem] leading-tight"
      >
        {!top && (
          <span className="min-w-0">
            <span
              className={`block truncate ${rank !== null ? 'font-semibold text-blask-ink' : 'text-blask-graphite'}`}
            >
              {rank?.name ?? 'Start'}
            </span>
            <span className="blask-num text-blask-graphite">
              od {(rank?.threshold ?? 0).toLocaleString('pl-PL')}
            </span>
          </span>
        )}
        <span className="ml-auto min-w-0 text-right">
          <span
            className={`block truncate ${top ? 'font-semibold text-blask-ink' : 'text-blask-graphite'}`}
          >
            {(top ? rank : nextRank)?.name}
          </span>
          <span className="blask-num text-blask-graphite">
            od {((top ? rank : nextRank)?.threshold ?? 0).toLocaleString('pl-PL')}
          </span>
        </span>
      </div>
    </div>
  )
}
