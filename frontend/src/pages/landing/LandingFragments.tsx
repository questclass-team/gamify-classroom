import { useEffect, useLayoutEffect, useRef, useState, type ComponentType } from 'react'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { CurrencyMark } from '../../components/blask/CurrencyMark'
import { CheckIcon, SpinnerIcon, UserIcon, UsersIcon } from '../../components/blask/icons'
import { RankStar } from '../../components/blask/RankStar'
import { starLevel } from '../../components/blask/ranks'
import { gsap } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { ACTIVITIES, LEADERBOARD, RANKS, STUDENT, UNIT, type Activity } from './content'
import { Amount } from './LandingAmount'
import { useCountTo } from './useCountTo'

/*
 * Working fragments of the product beside the steps of the loop. They play the real flows with
 * the example's numbers (nothing is sent anywhere): the teacher's award, the student's history,
 * the rank line and the group's ranking.
 */

/** Points before the award lands; with "Zadanie przy tablicy" they become the example's 285. */
const BASE = STUDENT.points - ACTIVITIES[1]!.points
const KOMETA = RANKS[1]!
const GWIAZDA = RANKS[2]!

/** A two-option switch in a pill (role radiogroup), as the lab draws it. */
function Toggle<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly (readonly [T, string, ComponentType<{ className?: string }>?])[]
  onChange: (value: T) => void
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-full border border-blask-line bg-blask-white p-0.5 text-sm"
    >
      {options.map(([option, text, Icon]) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={value === option}
          onClick={() => onChange(option)}
          className={`inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full px-3 font-medium transition-colors max-sm:min-h-11 ${
            value === option
              ? 'bg-blask-ink text-blask-pearl'
              : 'text-blask-graphite hover:bg-blask-peri-soft hover:text-blask-ink'
          }`}
        >
          {Icon && <Icon className="size-3.5" />}
          {text}
        </button>
      ))}
    </div>
  )
}

export function AwardFragment({
  activity,
  onPick,
}: {
  activity: Activity
  onPick: (activity: Activity) => void
}) {
  const [target, setTarget] = useState<'all' | 'one'>('one')
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle')
  const timer = useRef(0)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  const award = () => {
    if (state === 'busy') return
    setState('busy')
    timer.current = window.setTimeout(() => {
      setState('done')
      timer.current = window.setTimeout(() => setState('idle'), 1800)
    }, 550)
  }

  return (
    <div className="rounded-[16px] border border-blask-line bg-blask-paper p-4 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Przyznaj punkty</p>
        <Toggle
          label="Komu"
          value={target}
          onChange={setTarget}
          options={[
            ['all', 'Cała grupa', UsersIcon],
            ['one', 'Ewa Nowak', UserIcon],
          ]}
        />
      </div>
      <div role="group" aria-label="Za co" className="mt-4 grid gap-2">
        {ACTIVITIES.map((item) => (
          <button
            key={item.id}
            type="button"
            className="blask-pick justify-between"
            aria-pressed={activity.id === item.id}
            onClick={() => onPick(item)}
          >
            <span>{item.label}</span>
            <span className="font-semibold">
              <Amount value={item.points} signed />
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        onClick={award}
        className="blask-btn blask-btn-primary mt-4 w-full"
        data-busy={state === 'busy' || undefined}
        aria-disabled={state === 'busy' || undefined}
      >
        {state === 'busy' ? <SpinnerIcon /> : state === 'done' ? <CheckIcon /> : null}
        {state === 'done'
          ? 'Przyznano'
          : `Przyznaj +${activity.points} ${UNIT}${target === 'all' ? ' każdemu' : ''}`}
      </button>
      <p aria-live="polite" className="sr-only">
        {state === 'done' ? `Przyznano ${activity.points} ${UNIT} za: ${activity.label}.` : ''}
      </p>
    </div>
  )
}

export function LedgerFragment({ activity, active }: { activity: Activity; active: boolean }) {
  const balance = useCountTo(BASE + activity.points, active, BASE)
  const lineRef = useRef<HTMLLIElement>(null)
  const seen = useRef(false)

  useEffect(() => {
    if (!active || !lineRef.current || prefersReducedMotion()) return
    const first = !seen.current
    seen.current = true
    const tween = gsap.from(lineRef.current, {
      yPercent: first ? -120 : -40,
      opacity: 0,
      duration: 0.8,
      ease: 'expo.out',
    })
    return () => {
      tween.revert()
    }
  }, [active, activity.id])

  return (
    <div className="rounded-[16px] border border-blask-line bg-blask-white">
      <div className="flex items-end justify-between gap-4 border-b border-blask-line px-5 py-4">
        <div>
          <p className="text-sm text-blask-graphite">Twoje punkty w grupie</p>
          <p className="blask-display blask-num mt-1 text-[2.75rem] leading-none">
            <span>{balance}</span>
            <span className="ml-1.5 text-[1.5rem] text-blask-cobalt">{UNIT}</span>
          </p>
        </div>
        <CurrencyMark iconUrl={null} className="mb-1 size-7" />
      </div>
      <ol aria-label="Historia nagród" className="overflow-hidden px-5 py-2 text-[0.9375rem]">
        <li
          ref={lineRef}
          className="-mx-2 flex items-center justify-between gap-3 rounded-[10px] bg-blask-peri-soft px-2 py-2.5"
        >
          <span className="flex min-w-0 items-center gap-2.5">
            <CurrencyMark iconUrl={null} />
            <span className="truncate">{activity.label}</span>
          </span>
          <span className="font-semibold">
            <Amount value={activity.points} signed />
          </span>
        </li>
        <li className="flex items-center justify-between gap-3 border-t border-blask-line py-2.5 text-blask-graphite">
          <span className="flex items-center gap-2.5">
            <BadgeMark icon="star" size={16} />
            Odznaka „Bug Hunter”
          </span>
          <span className="text-sm">odznaka</span>
        </li>
        <li className="flex items-center justify-between gap-3 border-t border-blask-line py-2.5 text-blask-graphite">
          <span className="flex items-center gap-2.5">
            <CurrencyMark iconUrl={null} />
            Aktywność na zajęciach
          </span>
          <span className="blask-num">+10 {UNIT}</span>
        </li>
      </ol>
    </div>
  )
}

export function RankFragment({ activity, active }: { activity: Activity; active: boolean }) {
  const points = BASE + activity.points
  const promoted = points >= GWIAZDA.threshold
  const progress = Math.min(1, (points - KOMETA.threshold) / (GWIAZDA.threshold - KOMETA.threshold))
  const barRef = useRef<HTMLDivElement>(null)
  const count = useCountTo(Math.min(points, GWIAZDA.threshold), active, KOMETA.threshold)

  useLayoutEffect(() => {
    if (barRef.current) gsap.set(barRef.current, { scaleX: 0 })
  }, [])

  useEffect(() => {
    const bar = barRef.current
    if (!bar || !active) return
    if (prefersReducedMotion()) {
      gsap.set(bar, { scaleX: progress })
      return
    }
    const tween = gsap.to(bar, { scaleX: progress, duration: 1.3, ease: 'expo.out' })
    return () => {
      tween.kill()
    }
  }, [active, progress])

  return (
    <div className="rounded-[16px] border border-blask-line bg-blask-white p-5">
      <div className="flex items-baseline justify-between gap-3">
        <p className="flex flex-wrap items-center font-semibold">
          <RankStar level={starLevel(1, RANKS.length)} size={22} className="mr-1.5" />
          {KOMETA.name}
          <span className="mx-2 inline-block text-blask-graphite" aria-hidden="true">
            <svg viewBox="0 0 16 10" className="inline size-4" fill="none">
              <path
                d="M1 5h13M10 1l4 4-4 4"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </span>
          <span className="sr-only">do rangi </span>
          <RankStar
            level={starLevel(2, RANKS.length)}
            size={22}
            lit={promoted}
            className="mr-1.5"
          />
          {GWIAZDA.name}
        </p>
        <p className="blask-num text-sm text-blask-graphite">
          <span>{count}</span> / {GWIAZDA.threshold} {UNIT}
        </p>
      </div>
      <div
        role="progressbar"
        aria-label={`Postęp do rangi ${GWIAZDA.name}`}
        aria-valuemin={KOMETA.threshold}
        aria-valuemax={GWIAZDA.threshold}
        aria-valuenow={Math.min(points, GWIAZDA.threshold)}
        className="relative mt-4 h-2.5 overflow-hidden rounded-full bg-blask-peri-soft"
      >
        <div
          ref={barRef}
          className="absolute inset-0 origin-left rounded-full bg-[linear-gradient(90deg,#8e9bff,#2b3bff_70%,#6c3bf4)]"
        />
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
        {promoted ? (
          <span className="blask-chip bg-blask-cobalt text-blask-pearl">
            <CheckIcon className="size-3.5" />
            Awans: {GWIAZDA.name}
          </span>
        ) : (
          <span className="blask-chip blask-chip-cobalt blask-num">
            Brakuje {GWIAZDA.threshold - points} {UNIT}
          </span>
        )}
        <span className="text-blask-graphite">
          {promoted ? 'Nowa ranga od razu w Twoim stanie.' : 'Ranga przyjdzie sama.'}
        </span>
      </div>
    </div>
  )
}

/** The group's ranking after the award: by points or by badges, nicknames only. */
export function RankingFragment({ activity }: { activity: Activity }) {
  const [by, setBy] = useState<'points' | 'badges'>('points')
  const rows = LEADERBOARD.map((hero) =>
    hero.me ? { ...hero, points: BASE + activity.points } : hero,
  )
    .toSorted((a, b) => (by === 'points' ? b.points - a.points : b.badges - a.badges))
    .slice(0, 4)

  return (
    <div className="rounded-[16px] border border-blask-line bg-blask-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold">Ranking grupy</p>
        <Toggle
          label="Kolejność"
          value={by}
          onChange={setBy}
          options={[
            ['points', 'Punkty'],
            ['badges', 'Odznaki'],
          ]}
        />
      </div>
      <ol aria-label="Ranking grupy, cztery pierwsze miejsca" className="mt-4 grid gap-1">
        {rows.map((hero, index) => (
          <li
            key={hero.nick}
            className={`grid grid-cols-[1.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[10px] px-2 py-2 ${
              hero.me ? 'bg-blask-peri-soft' : ''
            }`}
          >
            <span className="blask-num text-sm text-blask-graphite">{index + 1}</span>
            <span className="truncate font-semibold">
              {hero.nick}
              {hero.me && <span className="font-normal text-blask-graphite"> (Ty)</span>}
            </span>
            <span className="font-semibold">
              {by === 'points' ? (
                <Amount value={hero.points} />
              ) : (
                <span className="blask-num inline-flex items-center gap-1.5">
                  {hero.badges}
                  <BadgeMark icon="medal" size={18} />
                  <span className="sr-only">odznak</span>
                </span>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
