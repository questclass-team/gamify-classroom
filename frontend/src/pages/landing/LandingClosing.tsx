import { useCallback, useRef, type RefObject } from 'react'
import { gsap, useGSAP } from '../../lib/gsap'
import { prefersReducedMotion } from '../../lib/useReducedMotion'
import type { FinaleDrive } from './FinaleState'
import { LoginCard } from './LandingLogin'
import { boostFlow, glowPulse } from './skyState'

/**
 * The last call to log in, on the night. Behind it the ribbon of the first screen returns in its
 * night form: the helix of light strands (painted by FinaleSky around `data-finale-helix`), which
 * pours in once from the left as the section arrives and answers the login with light.
 */
export function LandingClosing({
  drive,
  onPendingChange,
}: {
  drive: RefObject<FinaleDrive>
  onPendingChange: (pending: boolean) => void
}) {
  const root = useRef<HTMLElement>(null)

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const d = drive.current
        gsap.fromTo(
          d,
          { pour: 0 },
          {
            pour: 1,
            duration: 2.4,
            ease: 'power3.inOut',
            scrollTrigger: { trigger: root.current, start: 'top 70%', once: true },
          },
        )
        return () => {
          d.pour = 1
        }
      })
      return () => mm.revert()
    },
    { scope: root },
  )

  // The panel opening brightens the strands and quickens them; a refusal dims them for a breath.
  const onAnswer = useCallback(
    (accepted: boolean) => {
      if (prefersReducedMotion()) return
      const d = drive.current
      if (accepted) {
        glowPulse(d, 1)
        boostFlow(d, 2.4)
      } else {
        gsap
          .timeline()
          .to(d, { flare: -0.6, duration: 0.45, ease: 'power2.out', overwrite: 'auto' })
          .to(d, { flare: 0, duration: 1.1, ease: 'power2.inOut' })
      }
    },
    [drive],
  )

  return (
    <section
      ref={root}
      data-finale-start
      aria-labelledby="blask-closing-title"
      className="blask-closing blask-on-night relative isolate py-28 lg:py-36"
    >
      <div className="mx-auto flex max-w-[1360px] flex-col items-center px-[var(--blask-gutter)] text-center">
        <h2
          id="blask-closing-title"
          data-mask-title
          className="blask-display blask-h2 mx-auto max-w-[14ch]"
        >
          Twoje punkty już czekają.
        </h2>
        <p className="blask-lede mx-auto mt-5">
          Zaloguj się kontem wydziałowym i sprawdź punkty, rangę, odznaki i miejsce w rankingu.
        </p>
        <div data-finale-helix aria-hidden="true" className="h-44 w-full lg:h-52" />
        <LoginCard
          className="blask-fragment w-full max-w-[26rem] text-left"
          onAnswer={onAnswer}
          onPendingChange={onPendingChange}
        />
      </div>
    </section>
  )
}
