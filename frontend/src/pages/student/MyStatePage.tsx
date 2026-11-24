import { useCallback, useEffect, useRef, useState, type MouseEvent, type ReactNode } from 'react'
import { ApiError } from '../../api/client'
import { fetchMyGroupState } from '../../api/student'
import type { MyGroup, StudentGroupState } from '../../api/types'
import { useApiData } from '../../api/useApiData'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { Button } from '../../components/blask/Button'
import { Amount, CurrencyMark, type Currency } from '../../components/blask/CurrencyMark'
import { useCountUp } from '../../components/blask/countUp'
import { RankStar } from '../../components/blask/RankStar'
import { LoadingState, Skeleton } from '../../components/blask/States'
import { dateFormat } from '../../format'
import { ShellAside, ShellSubnav } from '../../layout/ShellSlots'
import { useStudentProfile } from '../../layout/studentProfile'
import { useScrollTo } from '../../lib/lenis'
import { BalanceChart } from './BalanceChart'
import { Chronicle } from './Chronicle'
import { balanceSeries, weekGain } from './panel'
import { amountInWords, knownStarLevels } from './progress'
import { RankLine } from './RankLine'
import { badgeCountText, NO_NICKNAME } from './ranking'
import { useStudentGroup } from './studentGroupContext'
import { GroupNotFound, LoadError } from './StudentParts'

const SECTIONS = [
  { id: 'stan-przeglad', label: 'Przegląd' },
  { id: 'stan-saldo', label: 'Saldo w czasie' },
  { id: 'stan-kronika', label: 'Kronika' },
  { id: 'stan-odznaki', label: 'Odznaki' },
] as const
type SectionId = (typeof SECTIONS)[number]['id']

/** The live header height plus a little air: where a section's top lands after a jump. */
function headerOffset(): number {
  const head = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue('--blask-head-h'),
  )
  return (Number.isNaN(head) ? 64 : head) + 16
}

/**
 * `/student/groups/:groupId`: the lab's Panel with the real state in the group: the balance with
 * the rank star, the rank line, the week in one sentence, the balance over time, the Kronika and
 * the badges. The balance chip goes into the header and the sections get links under it.
 */
export function MyStatePage() {
  const { group } = useStudentGroup()
  const load = useCallback((signal: AbortSignal) => fetchMyGroupState(group.id, signal), [group.id])
  const { state, reload } = useApiData(load)

  if (state.status === 'loading') {
    return (
      <LoadingState label="Ładowanie Twojego stanu…" className="flex flex-col gap-5">
        <div className="blask-panel grid gap-6 p-6 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.6fr)]">
          <div className="flex items-center gap-5">
            <Skeleton className="size-20 rounded-full" />
            <div className="flex flex-1 flex-col gap-3">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-3 w-full" />
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-3">
          <div className="blask-panel h-72" />
          <div className="blask-panel h-72" />
          <div className="blask-panel h-72" />
        </div>
      </LoadingState>
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
  const shown = useCountUp(data.balance, 1600)
  // The header's profile follows saves at once; the state was read before them.
  const myNickname = nickname === undefined ? data.nickname : nickname
  const balanceLabel = `Saldo: ${data.balance.toLocaleString('pl-PL')} (${currency.name})`
  const [now] = useState(() => Date.now())
  const gain = weekGain(data.rewards, now)
  const hasRanks = data.rank !== null || data.nextRank !== null
  const [active, pinSection] = useActiveSection()
  const scrollTo = useScrollTo()

  function jump(event: MouseEvent<HTMLAnchorElement>, id: SectionId) {
    event.preventDefault()
    const target = document.getElementById(id)
    if (target === null) return
    pinSection(id)
    scrollTo(target, -headerOffset())
    target.focus({ preventScroll: true })
  }

  return (
    <div className="flex flex-col gap-5">
      <ShellAside>
        <span className="blask-balance-chip blask-num max-sm:hidden">
          <span className="sr-only">{balanceLabel}</span>
          <span aria-hidden="true" className="contents">
            <CurrencyMark iconUrl={currency.iconUrl} className="size-[1.375rem]" />
            <span className="leading-none">{shown.toLocaleString('pl-PL')}</span>
          </span>
        </span>
      </ShellAside>
      <ShellSubnav>
        <nav
          aria-label="Sekcje panelu"
          className="hidden border-t border-(--blask-panel-border) lg:block"
        >
          <ul className="blask-content flex h-11 items-stretch gap-7">
            {SECTIONS.map((section) => (
              <li key={section.id} className="flex">
                <a
                  href={`#${section.id}`}
                  className="blask-sublink"
                  aria-current={section.id === active ? 'location' : undefined}
                  onClick={(event) => jump(event, section.id)}
                >
                  {section.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>
      </ShellSubnav>

      <section
        id="stan-przeglad"
        tabIndex={-1}
        aria-labelledby="stan-przeglad-title"
        className="blask-panel @container scroll-mt-32 focus:outline-none"
      >
        <h2 id="stan-przeglad-title" className="sr-only">
          Saldo i ranga
        </h2>
        <div className="grid gap-6 p-5 sm:p-6 @min-[46rem]:grid-cols-[auto_minmax(0,1fr)] @min-[46rem]:items-center @min-[46rem]:gap-0">
          <div className="flex items-center gap-[clamp(0.75rem,1.6vw,1.5rem)] @min-[46rem]:h-full @min-[46rem]:border-r @min-[46rem]:border-(--blask-divider) @min-[46rem]:pr-10">
            <span className="grid flex-none place-items-center">
              {hasRanks ? (
                <RankStar
                  level={knownStarLevels(data.rank, data.nextRank).current}
                  size={128}
                  lit={data.rank !== null}
                  twinkle
                  className="size-[clamp(4.5rem,5.5vw,5.75rem)]"
                />
              ) : (
                <CurrencyMark
                  iconUrl={currency.iconUrl}
                  className="size-[clamp(3.5rem,4.5vw,4.5rem)]"
                />
              )}
            </span>
            <p className="min-w-0">
              <span className="sr-only">{balanceLabel}</span>
              <span aria-hidden="true" className="block">
                <span className="block text-sm font-medium text-blask-graphite">
                  Saldo, {currency.name}
                </span>
                <span className="blask-balance-figure mt-1.5 flex items-baseline">
                  {shown.toLocaleString('pl-PL')}
                  {hasRanks && (
                    <CurrencyMark
                      iconUrl={currency.iconUrl}
                      className="ml-[0.14em] size-[0.36em] self-center"
                    />
                  )}
                </span>
              </span>
            </p>
          </div>

          <div className="min-w-0 @min-[46rem]:pl-10">
            <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
              <p className="text-blask-graphite">
                {hasRanks && 'Ranga '}
                <span className="blask-display text-[1.375rem] leading-none font-semibold tracking-[-0.02em] text-blask-ink">
                  {data.rank?.name ?? (hasRanks ? 'jeszcze żadna' : 'Bez rang')}
                </span>
              </p>
              {data.nextRank !== null ? (
                <p className="blask-num text-sm font-semibold text-blask-cobalt-deep">
                  {amountInWords(
                    Math.max(0, data.nextRank.threshold - data.balance),
                    currency.name,
                  )}{' '}
                  do rangi {data.nextRank.name}
                </p>
              ) : (
                data.rank !== null && (
                  <p className="text-sm font-semibold text-blask-cobalt-deep">
                    Najwyższa ranga w tej grupie
                  </p>
                )
              )}
            </div>
            {hasRanks ? (
              <div className="mt-4">
                <RankLine
                  balance={data.balance}
                  rank={data.rank}
                  nextRank={data.nextRank}
                  currency={currency}
                />
              </div>
            ) : (
              <p className="mt-3 max-w-[52ch] text-[0.9375rem] text-blask-graphite">
                Ta grupa nie ma jeszcze rang. Gdy prowadzący je ustawi, zobaczysz tu drogę do
                kolejnej rangi.
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-t border-(--blask-divider) px-5 py-3.5 sm:px-6">
          <p className="leading-snug text-blask-graphite">
            {gain > 0 ? (
              <>
                W tym tygodniu{' '}
                <strong className="font-semibold text-blask-ink">
                  <Amount value={gain} currency={currency} signed className="align-[-0.1em]" />
                </strong>
                .{' '}
              </>
            ) : (
              'W tym tygodniu bez nowych nagród. '
            )}
            {myNickname === null ? (
              <>W rankingu widać Cię jako „{NO_NICKNAME}”.</>
            ) : (
              <>
                W rankingu występujesz jako{' '}
                <strong className="font-semibold text-blask-ink">{myNickname}</strong>.
              </>
            )}
          </p>
          <Button
            variant="quiet"
            size="sm"
            onClick={(event) => openNicknameDialog(event.currentTarget)}
          >
            {myNickname === null ? 'Ustaw nick' : 'Zmień nick'}
          </Button>
        </div>
      </section>

      <div className="@container">
        <div className="grid items-start gap-5 @min-[46rem]:grid-cols-12 @min-[66rem]:grid-cols-3">
          <PanelCard
            id="stan-saldo"
            title="Saldo w czasie"
            className="@min-[46rem]:col-span-12 @min-[66rem]:col-span-1"
            aside={
              <span className="text-sm text-blask-graphite">
                od {dateFormat.format(new Date(group.joinedAt))}
              </span>
            }
          >
            <BalanceChart
              points={balanceSeries(data.rewards, data.balance, group.joinedAt, now)}
              currency={currency}
              nextRank={data.nextRank}
            />
          </PanelCard>

          <PanelCard
            id="stan-kronika"
            title="Kronika"
            className="@min-[46rem]:col-span-7 @min-[66rem]:col-span-1"
          >
            <Chronicle data={data} currency={currency} teacherName={group.teacherName} />
          </PanelCard>

          <PanelCard
            id="stan-odznaki"
            title="Odznaki"
            className="@min-[46rem]:col-span-5 @min-[66rem]:col-span-1"
            aside={
              <span className="text-sm text-blask-graphite">
                {data.badges.length === 0 ? 'jeszcze żadnej' : badgeCountText(data.badges.length)}
              </span>
            }
          >
            {data.badges.length === 0 ? (
              <p className="rounded-[16px] border border-dashed border-blask-peri px-5 py-8 text-center text-blask-graphite">
                Nie masz jeszcze odznak w tej grupie. Przyznaje je prowadzący, a każda pojawi się
                tutaj z opisem i datą.
              </p>
            ) : (
              <ul className="@container grid gap-2.5">
                {data.badges.map((award) => (
                  <li
                    key={award.id}
                    className="flex items-start gap-3 rounded-[16px] bg-[linear-gradient(160deg,var(--color-blask-white),var(--color-blask-mist))] p-3 shadow-[inset_0_0_0_1px_var(--color-blask-haze)]"
                  >
                    <BadgeMark icon={award.badge.icon} size={40} />
                    <div className="min-w-0">
                      <p className="leading-tight font-semibold">{award.badge.name}</p>
                      {award.badge.description !== '' && (
                        <p className="mt-0.5 text-[0.8125rem] leading-snug text-blask-graphite">
                          {award.badge.description}
                        </p>
                      )}
                      <p className="blask-num mt-1 text-xs font-medium text-blask-graphite">
                        zdobyta {dateFormat.format(new Date(award.createdAt))}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>
        </div>
      </div>
    </div>
  )
}

/** A Panel section: a panel with its h2 and a short note on the right of the head. */
function PanelCard({
  id,
  title,
  aside,
  className = '',
  children,
}: {
  id: SectionId
  title: string
  aside?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <section
      id={id}
      tabIndex={-1}
      aria-labelledby={`${id}-title`}
      className={`blask-panel scroll-mt-32 focus:outline-none ${className}`}
    >
      <div className="blask-panel-head flex-wrap gap-y-1">
        <h2 id={`${id}-title`} className="blask-panel-title">
          {title}
        </h2>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  )
}

/**
 * The section under the sticky header, for the glint of the section links (as in the lab). A
 * jump pins the chosen section while the page glides there, so a section the page cannot bring
 * up to the header (the end of a short page) still shows as the chosen one.
 */
function useActiveSection(): [SectionId, (id: SectionId) => void] {
  const [active, setActive] = useState<SectionId>(SECTIONS[0].id)
  const pinnedUntil = useRef(0)
  const pin = useCallback((id: SectionId) => {
    pinnedUntil.current = performance.now() + 1400
    setActive(id)
  }, [])
  useEffect(() => {
    let frame = 0
    const update = () => {
      frame = 0
      if (performance.now() < pinnedUntil.current) return
      const line = headerOffset() + 40
      // The last section whose top has passed under the header; side by side, the first wins.
      let current: SectionId = SECTIONS[0].id
      let best = -Infinity
      for (const section of SECTIONS) {
        const top = document.getElementById(section.id)?.getBoundingClientRect().top
        if (top !== undefined && top < line && top > best + 1) {
          current = section.id
          best = top
        }
      }
      // At the very end the last sections can never reach the header: the last one is current.
      const atEnd = window.scrollY + window.innerHeight >= document.documentElement.scrollHeight - 4
      setActive(atEnd && window.scrollY > 0 ? SECTIONS[SECTIONS.length - 1].id : current)
    }
    const onScroll = () => {
      if (frame === 0) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => {
      window.removeEventListener('scroll', onScroll)
      cancelAnimationFrame(frame)
    }
  }, [])
  return [active, pin]
}
