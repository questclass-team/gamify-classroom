import type { Rank } from '../../api/types'
import type { Currency } from './CurrencyMark'
import { rankProgress, rankProgressText, starLevel, type StarLevel } from './ranks'
import { RankStar } from './RankStar'

/**
 * Progress to the next rank on Blask's line of light: the current rank's star on the left, the
 * next one (dim until reached) on the right, the line lit up to the balance. The bar is a
 * progressbar with a text value, and the same progress is written out under it (`text` replaces
 * the default sentence, e.g. with the amount in the currency's words). `starLevels` sizes the stars
 * when `ranks` is not the group's full list (a student only learns the current and next rank).
 */
export function RankProgress({
  balance,
  ranks,
  currency,
  text: customText,
  starLevels,
}: {
  balance: number
  ranks: readonly Rank[]
  currency: Currency
  text?: string
  starLevels?: { current: StarLevel; next: StarLevel }
}) {
  const progress = rankProgress(balance, ranks)
  const text = customText ?? rankProgressText(progress)
  if (progress.count === 0) return <p className="text-sm text-blask-graphite">{text}</p>

  const { current, next, share, index, count } = progress
  const levels = starLevels ?? {
    current: starLevel(index, count),
    next: starLevel(index + 1, count),
  }
  const percent = `${(share * 100).toFixed(2)}%`
  const label = next === null ? `Ranga ${current?.name ?? ''}` : `Postęp do rangi ${next.name}`
  const valueText =
    next === null
      ? `${balance} (${currency.name}), najwyższa ranga`
      : `${balance} z ${next.threshold} (${currency.name}). ${text}`

  return (
    <div className="flex flex-col gap-2">
      <div
        role="progressbar"
        aria-label={label}
        aria-valuemin={current?.threshold ?? 0}
        aria-valuemax={next?.threshold ?? current?.threshold ?? 0}
        aria-valuenow={balance}
        aria-valuetext={valueText}
        className="flex items-center gap-2"
      >
        <RankStar level={levels.current} size={28} lit={current !== null} twinkle />
        <div aria-hidden="true" className="relative h-3 min-w-0 flex-1">
          <span className="blask-rank-track absolute inset-x-0 top-1/2 h-px -translate-y-1/2" />
          <span
            className="blask-rank-fill absolute top-1/2 left-0 h-[2px] -translate-y-1/2 rounded-full"
            style={{ width: percent }}
          />
          {next !== null && (
            <span
              className="blask-rank-head absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
              style={{ left: percent }}
            />
          )}
        </div>
        {next !== null && <RankStar level={levels.next} size={28} lit={false} />}
      </div>
      <div aria-hidden="true" className="flex justify-between gap-4 text-[0.8125rem] leading-tight">
        <span className="min-w-0">
          <span className="block truncate font-semibold">{current?.name ?? 'Bez rangi'}</span>
          <span className="blask-num text-blask-graphite">od {current?.threshold ?? 0}</span>
        </span>
        {next !== null && (
          <span className="min-w-0 text-right">
            <span className="block truncate text-blask-graphite">{next.name}</span>
            <span className="blask-num text-blask-graphite">od {next.threshold}</span>
          </span>
        )}
      </div>
      <p className="text-sm text-blask-graphite">{text}</p>
    </div>
  )
}
