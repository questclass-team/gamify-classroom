import { useLayoutEffect, useRef, useState } from 'react'
import { PlusIcon } from '../../components/blask/icons'
import { RankStar } from '../../components/blask/RankStar'
import { starLevel } from '../../components/blask/ranks'
import { gsap, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { FAQ, LEADERBOARD, PRIVACY, rankIndex, RANKS, ROLES } from './content'
import { Amount } from './LandingAmount'
import { revealAlongLine } from './landingLine'

/*
 * The calm end of the story, still in the night after Ranga: the privacy board, the three roles
 * and the questions. Pearl headings, moon text, lavender accents; product UI stays crisp white.
 */

const TOP = LEADERBOARD.slice(0, 5)

function rankOf(points: number) {
  const index = rankIndex(points)
  return { name: RANKS[index]!.name, level: starLevel(index, RANKS.length) }
}

/**
 * Tablica: the line of light runs out in a last soft point below the rank ladder, and the
 * product's privacy rule follows: the ranking shows nicknames only.
 */
export function Tablica({ live }: { live: boolean }) {
  const root = useRef<HTMLElement>(null)
  const tail = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      if (!live) return
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const clean = revealAlongLine(tail.current, { start: 'top 62%', end: 'bottom 62%' })
        gsap.from('[data-board] li', {
          opacity: 0,
          y: 18,
          duration: 1,
          ease: 'expo.out',
          stagger: 0.06,
          scrollTrigger: { trigger: '[data-board]', start: 'top 92%', once: true },
        })
        return clean
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [live], revertOnUpdate: true },
  )

  return (
    <section ref={root} id="tablica" aria-labelledby="blask-privacy-title">
      <div ref={tail} aria-hidden="true" className="relative h-[22svh]">
        <div data-line className="blask-line top-0 bottom-0">
          <span data-blask-fill className="blask-line-fill" />
        </div>
        <div data-step className="absolute inset-x-0 bottom-0">
          <span data-node data-lit="true" className="blask-node -top-[5px]" />
        </div>
      </div>

      <div className="mx-auto grid max-w-[1360px] gap-14 px-[var(--blask-gutter)] pt-[12vh] pb-[14vh] lg:grid-cols-12 lg:gap-8">
        <div className="lg:col-span-6">
          <h2
            id="blask-privacy-title"
            data-mask-title
            className="blask-display blask-h2 max-w-[13ch]"
          >
            {PRIVACY.title}
          </h2>
          <p className="blask-lede mt-6">{PRIVACY.text}</p>
        </div>
        <div className="lg:col-span-5 lg:col-start-8">
          <div data-board className="blask-fragment blask-surface-raised p-5 sm:p-6">
            <div className="flex items-baseline justify-between gap-4">
              <p className="font-semibold">Ranking grupy</p>
              <p className="text-sm text-blask-graphite">Widok studenta</p>
            </div>
            <ol aria-label="Ranking grupy, pięć pierwszych miejsc" className="mt-4 grid gap-1">
              {TOP.map((hero, index) => (
                <li
                  key={hero.nick}
                  className={`grid grid-cols-[1.75rem_2.25rem_minmax(0,1fr)_auto] items-center gap-3 rounded-[12px] px-2 py-2 ${
                    hero.me ? 'bg-blask-peri-soft' : ''
                  }`}
                >
                  <span className="blask-num text-sm text-blask-graphite">{index + 1}</span>
                  <span
                    aria-hidden="true"
                    className={`grid size-9 place-items-center rounded-full text-[0.8125rem] font-semibold ${
                      hero.me ? 'bg-blask-cobalt text-blask-pearl' : 'bg-blask-mist text-blask-ink'
                    }`}
                  >
                    {hero.nick.slice(0, 2).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate font-semibold">
                      {hero.nick}
                      {hero.me && <span className="font-normal text-blask-graphite"> (Ty)</span>}
                    </span>
                    <span className="flex items-center gap-1.5 text-sm text-blask-graphite">
                      <RankStar level={rankOf(hero.points).level} size={16} />
                      {rankOf(hero.points).name}
                    </span>
                  </span>
                  <span className="font-semibold">
                    <Amount value={hero.points} />
                  </span>
                </li>
              ))}
            </ol>
            <p className="mt-4 border-t border-blask-line pt-4 text-sm text-blask-graphite">
              Imię i nazwisko obok nicku widzi tylko prowadzący grupy.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function Roles() {
  return (
    <section aria-labelledby="blask-roles-title" className="py-20 lg:py-32">
      <div className="mx-auto max-w-[1360px] px-[var(--blask-gutter)]">
        <h2 id="blask-roles-title" data-mask-title className="blask-display blask-h2 max-w-[16ch]">
          Trzy role, jedna grupa
        </h2>
        <div className="mt-12 grid border-t border-blask-moon/15 lg:grid-cols-3">
          {ROLES.map((role, i) => (
            <article
              key={role.id}
              className={`py-8 lg:px-8 lg:py-10 ${i > 0 ? 'border-t border-blask-moon/15 lg:border-t-0 lg:border-l' : ''} ${
                i === 0 ? 'lg:pl-0' : ''
              }`}
            >
              <h3 className="blask-display blask-h3">{role.name}</h3>
              <p className="blask-copy mt-3">{role.text}</p>
              <ul className="mt-6 grid gap-2.5 text-[0.9375rem] text-blask-moon">
                {role.abilities.map((ability) => (
                  <li key={ability} className="flex items-start gap-3">
                    <svg
                      viewBox="0 0 16 16"
                      className="mt-1 size-4 flex-none text-blask-lavender"
                      aria-hidden="true"
                    >
                      <path
                        d="M8 1.5v13"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                        opacity="0.35"
                      />
                      <circle cx="8" cy="8" r="2.75" fill="currentColor" />
                    </svg>
                    {ability}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ------------------------------------------------------------------------------------------ */
/* Pytania                                                                                     */
/* ------------------------------------------------------------------------------------------ */

export function Faq() {
  const [open, setOpen] = useState(0)
  const rootRef = useRef<HTMLDivElement>(null)
  const previous = useRef(open)

  // Height follows the open item; the first paint is already correct without animation.
  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return
    const regions = root.querySelectorAll<HTMLElement>('[data-faq-region]')
    const was = previous.current
    previous.current = open
    if (was === open) return
    const reduce = prefersReducedMotion()
    regions.forEach((region, i) => {
      if (i === open) {
        gsap.fromTo(
          region,
          { height: 0 },
          { height: 'auto', duration: reduce ? 0 : 0.6, ease: 'expo.out' },
        )
        const inner = region.firstElementChild
        if (inner && !reduce)
          gsap.fromTo(
            inner,
            { y: -8, opacity: 0 },
            { y: 0, opacity: 1, duration: 0.5, ease: 'power3.out', delay: 0.05 },
          )
      } else if (i === was) {
        gsap.fromTo(
          region,
          { height: region.scrollHeight },
          { height: 0, duration: reduce ? 0 : 0.45, ease: 'expo.out' },
        )
      }
    })
  }, [open])

  return (
    <section
      id="pytania"
      aria-labelledby="blask-faq-title"
      className="scroll-mt-4 border-t border-blask-moon/15 py-24 lg:py-36"
    >
      <div className="mx-auto grid max-w-[1360px] gap-12 px-[var(--blask-gutter)] lg:grid-cols-12">
        <div className="lg:col-span-5">
          <h2 id="blask-faq-title" data-mask-title className="blask-display blask-h2">
            Pytania
          </h2>
          <p className="blask-lede mt-6">
            Krótko o logowaniu, prywatności i zasadach gry w grupie.
          </p>
        </div>
        <div ref={rootRef} className="lg:col-span-7">
          <ul className="border-t border-blask-moon/15">
            {FAQ.map((item, i) => {
              const expanded = open === i
              return (
                <li key={item.q} className="border-b border-blask-moon/15">
                  <h3>
                    <button
                      type="button"
                      id={`blask-faq-q${i}`}
                      aria-expanded={expanded}
                      aria-controls={`blask-faq-a${i}`}
                      onClick={() => setOpen(expanded ? -1 : i)}
                      className="group flex w-full cursor-pointer items-center justify-between gap-6 py-6 text-left text-[clamp(1.125rem,1.5vw,1.3125rem)] font-semibold transition-colors hover:text-blask-lavender"
                    >
                      {item.q}
                      <span
                        aria-hidden="true"
                        className={`grid size-9 flex-none place-items-center rounded-full border transition-[transform,background-color,border-color,color] duration-300 ${
                          expanded
                            ? 'rotate-45 border-blask-lavender bg-blask-lavender text-blask-night'
                            : 'border-blask-moon/35 text-blask-pearl group-hover:border-blask-lavender'
                        }`}
                      >
                        <PlusIcon className="size-4" />
                      </span>
                    </button>
                  </h3>
                  <div
                    id={`blask-faq-a${i}`}
                    role="region"
                    aria-labelledby={`blask-faq-q${i}`}
                    data-faq-region
                    inert={!expanded}
                    className="overflow-hidden"
                    style={{ height: i === 0 ? 'auto' : 0 }}
                  >
                    <p className="blask-copy pb-7 text-[1.0625rem] sm:pr-14">{item.a}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
      </div>
    </section>
  )
}
