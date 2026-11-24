import type { Rank } from '../../api/types'
import { Amount, type Currency } from '../../components/blask/CurrencyMark'
import { starLevel } from '../../components/blask/ranks'
import { RankStar } from '../../components/blask/RankStar'

/**
 * The group's ranks as the student will see them: stars on Blask's line of light, growing with
 * the rank, each with its name and threshold under it (the lab's rank line, all lit, since this is
 * the whole path rather than one student's progress). Sideways in a wide panel, down the side in a
 * narrow one (container query in teacher.css). `ranks` must be sorted by threshold.
 */
export function RankPath({ ranks, currency }: { ranks: readonly Rank[]; currency: Currency }) {
  return (
    <div
      role="region"
      aria-label="Ścieżka rang"
      tabIndex={0}
      className="blask-rank-path"
      data-lenis-prevent
    >
      <ol>
        {ranks.map((rank, index) => (
          <li key={`${rank.threshold}-${rank.name}`} className="blask-rank-path__step">
            <span className="blask-rank-path__star">
              <RankStar level={starLevel(index, ranks.length)} size={36} />
            </span>
            <span className="blask-rank-path__text">
              <span className="block leading-tight font-semibold text-blask-ink">{rank.name}</span>
              <span className="block text-blask-graphite">
                od <Amount value={rank.threshold} currency={currency} />
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
