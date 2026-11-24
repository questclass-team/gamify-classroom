import { useRef, type RefObject } from 'react'
import { RankStar } from '../../components/blask/RankStar'
import { starLevel } from '../../components/blask/ranks'
import { gsap, useGSAP } from '../../lib/gsap'
import { LAB, RANKS, STUDENT, UNIT } from './content'
import { Amount } from './LandingAmount'
import { revealAlongLine } from './landingLine'
import type { BlindsDrive } from './NocState'

const MOTION = '(prefers-reduced-motion: no-preference)'

/** The example's own numbers: Cicha_Sowa's points, the next lab's reward, the rank it crosses. */
const BEFORE = STUDENT.points
const AFTER = BEFORE + LAB.points
const NEXT = RANKS.findIndex((rank) => rank.threshold > BEFORE)
const FROM = RANKS[NEXT - 1]!
const TO = RANKS[NEXT]!
const level = (index: number) => starLevel(index, RANKS.length)

interface LandingRangaProps {
  /** The sky runs: the scene is pinned and the blinds are painted by the sky. */
  live: boolean
  /** The sweep and flare the sky's blinds read. */
  blinds: RefObject<BlindsDrive>
}

/**
 * Ranga: the rank-up shot. Light crosses diagonal blinds (painted by the sky inside the
 * stage) behind the giant rank word while the counter climbs; at the threshold the word slides
 * to the new rank through its line mask and the blinds flare once. Below, the default ladder on
 * the line of light.
 */
export function LandingRanga({ live, blinds }: LandingRangaProps) {
  const root = useRef<HTMLElement>(null)
  const pin = useRef<HTMLDivElement>(null)
  const word = useRef<HTMLSpanElement>(null)
  const count = useRef<HTMLSpanElement>(null)
  const ladder = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, (context) => {
        const wordEl = word.current
        const countEl = count.current
        if (!live || !wordEl || !countEl) return
        const u = blinds.current
        const proxy = { points: BEFORE }
        const render = () => {
          countEl.textContent = String(Math.round(proxy.points))
        }
        wordEl.textContent = FROM.name
        render()
        gsap.set('[data-rank="after"]', { autoAlpha: 0 })
        gsap.set('[data-rank="before"]', { autoAlpha: 1 })

        let flipped = false
        // A named context method: not run now, and a later revert also undoes what it tweened.
        const flip = context.add('flip', (up: boolean) => {
          gsap.killTweensOf(wordEl)
          // Out through the top of the mask, the new rank in from below (the headline's motion).
          gsap
            .timeline()
            .to(wordEl, { yPercent: up ? -105 : 105, duration: 0.32, ease: 'power2.in' })
            .add(() => {
              wordEl.textContent = up ? TO.name : FROM.name
            })
            .fromTo(
              wordEl,
              { yPercent: up ? 105 : -105 },
              { yPercent: 0, duration: 1, ease: 'expo.out' },
            )
          gsap.to('[data-rank="before"]', {
            autoAlpha: up ? 0 : 1,
            duration: 0.5,
            overwrite: true,
          })
          gsap.to('[data-rank="after"]', { autoAlpha: up ? 1 : 0, duration: 0.7, overwrite: true })
          if (up) gsap.fromTo(u, { pulse: 1 }, { pulse: 0, duration: 1.8, ease: 'expo.out' })
        })

        const timeline = gsap.timeline({
          scrollTrigger: {
            trigger: pin.current,
            start: 'top top',
            end: 'bottom bottom',
            scrub: 0.6,
            onUpdate: (self) => {
              const up = self.progress >= 0.5
              if (up !== flipped) {
                flipped = up
                flip(up)
              }
            },
          },
        })
        timeline
          .fromTo(u, { sweep: 0 }, { sweep: 1, ease: 'none', duration: 1 }, 0)
          .fromTo(
            proxy,
            { points: BEFORE },
            { points: TO.threshold, ease: 'none', duration: 0.5, onUpdate: render },
            0,
          )
          .fromTo(
            proxy,
            { points: TO.threshold },
            {
              points: AFTER,
              ease: 'power2.out',
              duration: 0.3,
              immediateRender: false,
              onUpdate: render,
            },
            0.5,
          )

        return () => {
          wordEl.textContent = TO.name
          countEl.textContent = String(AFTER)
          Object.assign(u, { sweep: 0.5, pulse: 0 })
        }
      })
      mm.add({ motion: MOTION, wide: '(min-width: 1024px)' }, (context) => {
        const { motion, wide } = context.conditions!
        if (!motion) return
        return revealAlongLine(ladder.current, {
          axis: wide ? 'x' : 'y',
          start: wide ? 'top 75%' : 'top 68%',
          end: wide ? 'top 30%' : 'bottom 68%',
        })
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [live], revertOnUpdate: true },
  )

  return (
    <section
      ref={root}
      id="ranga"
      aria-labelledby="blask-ranga-title"
      className="blask-rank blask-on-night scroll-mt-0"
    >
      <div ref={pin} className="blask-rank-pin">
        <div data-sky-blinds className="blask-rank-stage">
          <div aria-hidden="true" className="blask-blinds-still" />
          {/* Keeps the copy at the top and bottom readable while the light passes behind it. */}
          <div aria-hidden="true" className="blask-rank-veil" />
          <div className="relative mx-auto grid h-full max-w-[1360px] grid-rows-[auto_1fr_auto] px-[var(--blask-gutter)] pt-[max(6rem,12vh)] pb-[9vh]">
            <div className="max-w-[30rem]">
              <h2
                id="blask-ranga-title"
                data-mask-title
                className="blask-display blask-h2 max-w-[12ch]"
              >
                Ranga rośnie sama
              </h2>
              <p className="blask-lede mt-5">
                Progi ustala prowadzący. Wystarczy je przekroczyć, a nowa ranga przychodzi bez
                czekania na koniec semestru.
              </p>
            </div>
            <div />
            <div>
              <p className="sr-only">
                Przykład: masz {BEFORE} {UNIT} i rangę {FROM.name}. {LAB.name} daje {LAB.points}{' '}
                {UNIT}, razem {AFTER} {UNIT}. Od {TO.threshold} {UNIT} zaczyna się ranga {TO.name}.
              </p>
              <div aria-hidden="true">
                <p className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                  <span className="blask-display blask-num text-[clamp(2rem,3vw,2.75rem)] leading-none text-blask-pearl">
                    <span ref={count}>{AFTER}</span>
                    <span className="blask-amount-g"> {UNIT}</span>
                  </span>
                  <span className="text-[1.0625rem] text-blask-moon">
                    {LAB.name}: +{LAB.points} {UNIT}
                  </span>
                </p>
                <div className="mt-2 flex items-center gap-[clamp(0.5rem,2vw,1.75rem)]">
                  {/* The rank's star swaps with the word and grows with it. */}
                  <span className="relative size-[clamp(3.25rem,9.5vw,8.5rem)] flex-none">
                    <span data-rank="before" className="invisible absolute inset-0 opacity-0">
                      <RankStar level={level(NEXT - 1)} size={136} className="size-full" />
                    </span>
                    <span data-rank="after" className="absolute inset-0">
                      <RankStar level={level(NEXT)} size={136} twinkle className="size-full" />
                    </span>
                  </span>
                  <p className="blask-line-mask blask-rank-word">
                    <span ref={word}>{TO.name}</span>
                  </p>
                </div>
                <div className="relative mt-[clamp(1rem,3.2vw,2.5rem)] h-[3.2em] max-w-[42ch] text-[1.0625rem] leading-relaxed text-blask-moon">
                  <p data-rank="before" className="invisible absolute inset-0 opacity-0">
                    Do rangi {TO.name} brakuje {TO.threshold - BEFORE} {UNIT}.
                  </p>
                  <p data-rank="after" className="absolute inset-0">
                    Próg {TO.threshold} {UNIT} przekroczony. Nowa ranga jest już w Twoim stanie
                    grupy i w rankingu.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={ladder} className="px-[var(--blask-gutter)] pt-[12vh] pb-[16vh]">
        <div className="mx-auto max-w-[1360px]">
          <h3 data-mask-title className="blask-display text-[clamp(2rem,3.6vw,3.25rem)]">
            Drabina rang
          </h3>
          <p className="blask-copy mt-4 max-w-[48ch] text-[1.0625rem]">
            Tak może wyglądać drabina jednej grupy. Nazwy i progi ustala prowadzący, osobno dla
            każdej grupy.
          </p>
          <div className="relative mt-16">
            <div data-line="x" className="blask-hline top-[5px] right-0 left-0 max-lg:hidden">
              <span data-blask-fill className="blask-line-fill" />
            </div>
            <div data-line className="blask-line blask-line--ladder top-0 bottom-0 lg:hidden">
              <span data-blask-fill className="blask-line-fill" />
            </div>
            <ol className="grid gap-14 lg:grid-cols-4 lg:gap-10">
              {RANKS.map((rank, index) => (
                <li key={rank.name} data-step className="relative pl-12 lg:pt-14 lg:pl-0">
                  <span
                    data-node
                    data-lit="true"
                    aria-hidden="true"
                    className="blask-node blask-node--ladder"
                  />
                  <div data-card data-lit="true" className="blask-lit-card">
                    <p className="flex items-center justify-between gap-4 text-blask-moon">
                      <RankStar level={level(index)} size={44} />
                      <span className="text-[0.9375rem]">
                        od <Amount value={rank.threshold} />
                      </span>
                    </p>
                    <h4 className="blask-display mt-3 text-[clamp(2rem,3vw,2.75rem)]">
                      {rank.name}
                    </h4>
                    <p className="blask-copy mt-3 max-w-[30ch] text-[1rem]">{rank.text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </section>
  )
}
