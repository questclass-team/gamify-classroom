import { useRef, type RefObject } from 'react'
import { BadgeMark } from '../../components/blask/BadgeMark'
import { ACTIVITIES, UNIT } from './content'
import { gsap, useGSAP } from '../../lib/gsap'
import { useReducedMotion } from '../../lib/useReducedMotion'
import { revealAlongLine, setLit, useMediaQuery } from './NagrodyLine'
import { NagrodySpark } from './NagrodySpark'
import type { SkyDrive } from './skyState'

const MOTION = '(prefers-reduced-motion: no-preference)'
const MAX_POINTS = Math.max(...ACTIVITIES.map((item) => item.points))

/** `+25 pkt` on the night: a thin plus, the figure in pearl, the unit in lavender. */
function Reward({ points }: { points: number }) {
  return (
    <>
      <span className="blask-ng-plus">+</span>
      {points}
      <span className="text-blask-lavender"> {UNIT}</span>
    </>
  )
}

function NagrodyIntro({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <h2 id="nagrody-title" data-mask-title className="blask-display blask-h2 text-blask-pearl">
        Ile jest warta nagroda
      </h2>
      <p className="mt-6 max-w-[38ch] text-[1.0625rem] leading-relaxed text-blask-moon sm:text-lg">
        Ile i za co, decyduje prowadzący przy każdej nagrodzie. Tak wyglądają typowe: im większy
        wysiłek, tym jaśniejsza iskra.
      </p>
    </div>
  )
}

function NagrodyOutro({ className = '' }: { className?: string }) {
  return (
    <div className={className}>
      <p className="blask-display flex items-center gap-4 text-[clamp(2rem,3.4vw,3rem)] leading-[1.04] text-blask-pearl">
        <BadgeMark icon="trophy" size={56} />
        Odznaki za to, czego punkty nie mierzą
      </p>
      <p className="mt-5 max-w-[36ch] text-[1.0625rem] leading-relaxed text-blask-moon">
        Prowadzący tworzy odznaki dla grupy i przyznaje je za wyjątkowe osiągnięcia. Ranking można
        ułożyć także według ich liczby.
      </p>
    </div>
  )
}

interface LandingNagrodyProps {
  live: boolean
  drive: RefObject<SkyDrive>
}

/**
 * Nagrody: on wide screens the chapter pins and the line of light runs
 * sideways while the track slides past; each four-point star ignites as the light reaches it.
 * Narrow screens and reduced motion stack the stars on a vertical line that lights by scroll
 * (or stays lit). Transparent over the live sky; paints the night itself without it.
 */
export function LandingNagrody(_props: LandingNagrodyProps) {
  const root = useRef<HTMLElement>(null)
  const track = useRef<HTMLDivElement>(null)
  const reduced = useReducedMotion()
  const wide = useMediaQuery('(min-width: 1024px)')
  const horizontal = wide && !reduced

  useGSAP(
    () => {
      if (!horizontal) {
        const mm = gsap.matchMedia()
        mm.add(MOTION, () => revealAlongLine(track.current))
        return () => mm.revert()
      }
      const trackEl = track.current
      const fill = trackEl?.querySelector<HTMLElement>('[data-line-fill]')
      if (!trackEl || !fill) return
      const steps = [...trackEl.querySelectorAll<HTMLElement>('[data-step]')]
      let fractions: number[] = []
      const measure = () => {
        const width = Math.max(1, trackEl.scrollWidth)
        fractions = steps.map((step) => {
          const node = step.querySelector<HTMLElement>('[data-node]') ?? step
          return (step.offsetLeft + node.offsetLeft + node.offsetWidth / 2) / width
        })
      }
      const distance = () => Math.max(0, trackEl.scrollWidth - window.innerWidth)
      // The tip of the light rides at 68% of the viewport while the track slides past.
      const tipStart = () => (window.innerWidth * 0.68) / trackEl.scrollWidth
      const tipEnd = () => (trackEl.scrollWidth - window.innerWidth * 0.32) / trackEl.scrollWidth

      measure()
      steps.forEach((step) => setLit(step, false))
      const timeline = gsap.timeline({
        scrollTrigger: {
          trigger: root.current,
          pin: true,
          start: 'top top',
          end: () => `+=${distance()}`,
          scrub: 0.6,
          invalidateOnRefresh: true,
          refreshPriority: 10,
          onRefresh: measure,
        },
      })
      timeline.fromTo(trackEl, { x: 0 }, { x: () => -distance(), ease: 'none' }, 0).fromTo(
        fill,
        { scaleX: tipStart },
        {
          scaleX: tipEnd,
          ease: 'none',
          onUpdate: () => {
            const tip = Number(gsap.getProperty(fill, 'scaleX'))
            steps.forEach((step, index) => setLit(step, tip >= (fractions[index] ?? 0)))
          },
        },
        0,
      )
      return () => steps.forEach((step) => setLit(step, true))
    },
    { scope: root, dependencies: [horizontal], revertOnUpdate: true },
  )

  if (horizontal) {
    return (
      <section
        ref={root}
        id="nagrody"
        aria-labelledby="nagrody-title"
        className="blask-ng relative overflow-hidden"
      >
        <div ref={track} className="blask-ng-track relative">
          <div data-line="x" className="blask-ng-hline top-1/2 right-0 left-0">
            <span data-line-fill className="blask-ng-fill" />
          </div>
          <div className="relative h-full w-[min(42vw,640px)] shrink-0">
            <NagrodyIntro className="absolute right-[5vw] bottom-[calc(50%+3.5rem)] left-[clamp(1.25rem,4vw,3.5rem)]" />
          </div>
          <ul className="flex h-full">
            {ACTIVITIES.map((item) => {
              const weight = item.points / MAX_POINTS
              return (
                <li key={item.id} data-step className="relative h-full w-[34vw] shrink-0">
                  <div
                    data-node
                    data-lit="true"
                    className="blask-ng-spark absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                  >
                    <NagrodySpark weight={weight} size={70 + weight * 150} />
                  </div>
                  <div
                    data-card
                    data-lit="true"
                    className="blask-ng-card absolute inset-x-0 top-1/2 h-0 text-center"
                  >
                    <p className="blask-ng-amount absolute inset-x-0 bottom-[8.5rem] text-[clamp(4rem,6.5vw,6rem)]">
                      <Reward points={item.points} />
                    </p>
                    <p className="absolute inset-x-0 top-[8.5rem] mx-auto max-w-[18ch] text-lg leading-snug text-blask-moon">
                      {item.label}
                    </p>
                  </div>
                </li>
              )
            })}
          </ul>
          <div className="relative h-full w-[min(42vw,620px)] shrink-0">
            <NagrodyOutro className="absolute top-[calc(50%+3.5rem)] right-[clamp(1.25rem,4vw,3.5rem)] left-[4vw]" />
          </div>
        </div>
      </section>
    )
  }

  return (
    <section
      ref={root}
      id="nagrody"
      aria-labelledby="nagrody-title"
      className="blask-ng relative px-[var(--blask-gutter,1.25rem)] py-[14vh]"
    >
      <div className="mx-auto max-w-[1100px]">
        <NagrodyIntro />
        <div ref={track} className="relative mt-16">
          <div data-line="y" className="blask-ng-vline top-0 bottom-0 left-[44px]">
            <span data-line-fill className="blask-ng-fill" />
          </div>
          <ul className="grid gap-14">
            {ACTIVITIES.map((item) => {
              const weight = item.points / MAX_POINTS
              return (
                <li key={item.id} data-step className="relative flex items-center gap-4">
                  <div
                    data-node
                    data-lit="true"
                    className="blask-ng-spark grid w-[88px] shrink-0 place-items-center"
                  >
                    <NagrodySpark weight={weight} size={40 + weight * 64} />
                  </div>
                  <div data-card data-lit="true" className="blask-ng-card min-w-0">
                    <p className="blask-ng-amount text-[clamp(3rem,12vw,4.5rem)]">
                      <Reward points={item.points} />
                    </p>
                    <p className="mt-2 text-[1.0625rem] text-blask-moon">{item.label}</p>
                  </div>
                </li>
              )
            })}
          </ul>
        </div>
        <NagrodyOutro className="mt-20" />
      </div>
    </section>
  )
}
