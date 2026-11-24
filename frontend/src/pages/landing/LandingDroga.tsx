import { useRef, useState, type RefObject } from 'react'
import { ACTIVITIES, LOOP, type Activity } from './content'
import { gsap, SplitText, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import { AwardFragment, LedgerFragment, RankFragment, RankingFragment } from './LandingFragments'
import { revealAlongLine } from './landingLine'
import type { SkyDrive } from './skyState'

const MOTION = '(prefers-reduced-motion: no-preference)'

interface LandingDrogaProps {
  /** The sky runs: the dusk and the beam are a scroll-scrubbed stretch with a sticky stage. */
  live: boolean
  drive: RefObject<SkyDrive>
}

/**
 * Zmierzch and Droga. While the paper sinks into the night (the `data-sky-dusk` stretch, a screen
 * and a half long), the hero's ribbon is drawn into the beam, which lands on the ground of this
 * stage (the sky does the drawing; this chapter owns the stretch of scroll that drives it). Only
 * when the night is full do the chapter's words arrive. The beam goes on as a line of light:
 * each step of the loop has a node that ignites as the light reaches it, and a working
 * product fragment beside it.
 */
export function LandingDroga({ live, drive }: LandingDrogaProps) {
  const root = useRef<HTMLElement>(null)
  const rise = useRef<HTMLDivElement>(null)
  const list = useRef<HTMLDivElement>(null)
  const [activity, setActivity] = useState<Activity>(ACTIVITIES[1]!)
  const [reached, setReached] = useState(() => (prefersReducedMotion() ? 3 : -1))

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add(MOTION, () => {
        setReached(-1)
        let split: SplitText | null = null
        if (live) {
          // The stretch of scroll that draws the ribbon into the beam, smoothed: the sky reads
          // `beam` from the drive this timeline tweens.
          const timeline = gsap.timeline({
            scrollTrigger: {
              trigger: rise.current,
              start: 'top bottom',
              end: 'bottom bottom',
              scrub: 1.2,
            },
          })
          timeline.fromTo(drive.current, { beam: 0 }, { beam: 1, duration: 1, ease: 'none' }, 0)
          // The words arrive once the night under them is full, through the headline's mask.
          split = SplitText.create('[data-rise="title"]', { type: 'lines', mask: 'lines' })
          timeline
            // A darker veil behind the words keeps them clear of the lit fog.
            .from('[data-rise="veil"]', { opacity: 0, duration: 0.12, ease: 'none' }, 0.74)
            .from(
              split.lines,
              { yPercent: 105, duration: 0.07, stagger: 0.015, ease: 'expo.out' },
              0.84,
            )
            .from(
              '[data-rise="lede"]',
              { opacity: 0, y: 18, duration: 0.07, ease: 'expo.out' },
              0.88,
            )
        }
        const clean = revealAlongLine(list.current, {
          onStep: (index) => setReached((value) => Math.max(value, index)),
        })
        return () => {
          drive.current.beam = 0
          split?.revert()
          clean?.()
          setReached(3)
        }
      })
      return () => mm.revert()
    },
    { scope: root, dependencies: [live], revertOnUpdate: true },
  )

  const fragments = [
    <AwardFragment key="award" activity={activity} onPick={setActivity} />,
    <LedgerFragment key="ledger" activity={activity} active={reached >= 1} />,
    <RankFragment key="rank" activity={activity} active={reached >= 2} />,
    <RankingFragment key="ranking" activity={activity} />,
  ]

  return (
    <section
      ref={root}
      id="droga"
      aria-labelledby="blask-droga-title"
      className="blask-droga scroll-mt-0"
    >
      <div ref={rise} className="blask-rise">
        <span data-sky-dusk aria-hidden="true" className="blask-dusk" />
        <div className="blask-rise-stage">
          <div className="blask-beam-still" aria-hidden="true" />
          <span data-sky-ground aria-hidden="true" className="blask-ground" />
          <div data-rise="veil" aria-hidden="true" className="blask-rise-veil" />
          <div className="blask-rise-copy blask-on-night">
            <div className="mx-auto max-w-[1360px] pr-[var(--blask-gutter)] pl-[calc(var(--blask-axis)+1.75rem)] lg:pl-[var(--blask-gutter)]">
              <div className="lg:w-[calc(50%-4rem)]">
                <h2
                  id="blask-droga-title"
                  data-rise="title"
                  className="blask-display blask-h2 max-w-[11ch]"
                >
                  Semestr to jedna droga
                </h2>
                <p data-rise="lede" className="blask-lede mt-6 max-w-[40ch]">
                  Cztery kroki powtarzają się co tydzień, od aktywności na zajęciach do miejsca w
                  rankingu. Światło przechodzi przez każdy z nich, a każdy zostawia ślad, który
                  widzisz od razu.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div ref={list} className="blask-on-night relative pt-[4vh] pb-[20vh]">
        {/* Starts at the ground where the beam landed. */}
        <div data-line className="blask-line top-[-12svh] bottom-0">
          <span data-blask-fill className="blask-line-fill" />
        </div>
        <ol className="grid gap-[14vh] lg:gap-[18vh]">
          {LOOP.map((step, index) => {
            const flip = index % 2 === 1
            return (
              <li
                key={step.id}
                data-step
                className="relative mx-auto grid w-full max-w-[1360px] gap-8 pr-[var(--blask-gutter)] pl-[calc(var(--blask-axis)+1.75rem)] lg:grid-cols-2 lg:gap-0 lg:px-[var(--blask-gutter)]"
              >
                <span
                  data-node
                  data-lit="true"
                  aria-hidden="true"
                  className="blask-node top-[0.85rem]"
                />
                <div
                  data-card
                  data-lit="true"
                  className={`blask-lit-card lg:row-start-1 ${
                    flip ? 'lg:col-start-2 lg:pl-16' : 'lg:col-start-1 lg:pr-16 lg:text-right'
                  }`}
                >
                  <div className={flip ? 'max-w-[28rem]' : 'max-w-[28rem] lg:ml-auto'}>
                    <p
                      aria-hidden="true"
                      className="blask-display blask-num text-[1.375rem] leading-none text-blask-lavender"
                    >
                      {index + 1}
                    </p>
                    <h3 className="blask-display mt-3 text-[clamp(2.25rem,4vw,3.5rem)] leading-[0.98]">
                      <span className="sr-only">Krok {index + 1}: </span>
                      {step.title}
                    </h3>
                    <p className="blask-copy mt-4 text-[1.0625rem]">{step.text}</p>
                  </div>
                </div>
                <div
                  data-card
                  data-lit="true"
                  className={`blask-lit-card min-w-0 lg:row-start-1 ${
                    flip ? 'lg:col-start-1 lg:pr-16' : 'lg:col-start-2 lg:pl-16'
                  }`}
                >
                  <div
                    className={`blask-fragment w-full max-w-[30rem] ${flip ? 'lg:ml-auto' : ''}`}
                  >
                    {fragments[index]}
                  </div>
                </div>
              </li>
            )
          })}
        </ol>
      </div>
    </section>
  )
}
