import { useCallback, useEffect, useRef, useState, type MouseEvent } from 'react'
import { Navigate } from 'react-router'
import { useAuth } from '../auth/authContext'
import { ROLE_HOME } from '../auth/roles'
import { FullPageMessage } from '../components/FullPageMessage'
import { ThemeSwitch } from '../components/blask/ThemeSwitch'
import { Wordmark } from '../components/blask/Wordmark'
import { gsap, ScrollTrigger, SplitText, useGSAP } from '../lib/gsap'
import { useScrollTo } from '../lib/lenis'
import { useTheme } from '../lib/theme'
import { prefersReducedMotion, useReducedMotion } from '../lib/useReducedMotion'
import { PRODUCT } from './landing/content'
import { FinaleFooter } from './landing/FinaleFooter'
import { FinaleSky } from './landing/FinaleSky'
import { finaleDrive } from './landing/FinaleState'
import { Faq, Roles, Tablica } from './landing/LandingCalm'
import { LandingClosing } from './landing/LandingClosing'
import { LandingDroga } from './landing/LandingDroga'
import { LoginCard } from './landing/LandingLogin'
import { LandingNagrody } from './landing/LandingNagrody'
import { LandingPunkty } from './landing/LandingPunkty'
import { LandingRanga } from './landing/LandingRanga'
import { LandingSky } from './landing/LandingSky'
import { blindsDrive } from './landing/NocState'
import { boostFlow, skyDrive } from './landing/skyState'

// SplitText measures the headlines' lines once, when the landing mounts: let the faces arrive
// first (this module is a lazy route, so the wait is part of loading the page). A failed load
// only costs the exact line breaks.
await Promise.all([
  document.fonts.load('650 1em "Bricolage Grotesque Variable"', 'Grywalizacja zajęć'),
  document.fonts.load('1em "Figtree Variable"', 'Prowadzący'),
]).catch(() => undefined)

const NAV = [
  { href: '#droga', label: 'Droga' },
  { href: '#nagrody', label: 'Nagrody' },
  { href: '#punkty', label: 'Punkty' },
  { href: '#ranga', label: 'Ranga' },
  { href: '#pytania', label: 'Pytania' },
] as const

/** How far (0–1) the reading line `y` has gone through a stretch of the page. */
function through(element: Element | null, y: number) {
  if (!element) return 0
  const box = element.getBoundingClientRect()
  return Math.min(1, Math.max(0, (y - box.top) / Math.max(1, box.height)))
}

const HERO_LOGIN_ID = 'blask-hero-login'

/** Asks once; the probe context is released at once, so it never counts against the page. */
function hasWebGL2() {
  try {
    const gl = document.createElement('canvas').getContext('webgl2')
    gl?.getExtension('WEBGL_lose_context')?.loseContext()
    return gl !== null
  } catch {
    return false
  }
}

/**
 * `/login`: the Blask landing with the login. Signed-in users go to their role's home, except while
 * a sign-in from this page runs (the form then sends them back where they came from).
 */
export function LoginPage() {
  const { state } = useAuth()
  const [signingIn, setSigningIn] = useState(false)

  if (state.status === 'loading') return <FullPageMessage>Ładowanie…</FullPageMessage>
  if (state.status === 'authenticated' && !signingIn) {
    return <Navigate to={ROLE_HOME[state.user.role]} replace />
  }
  return <Landing onPendingChange={setSigningIn} />
}

/**
 * Blask: one scroll story in one palette. A calm first screen on paper; as it leaves, the
 * ribbon is drawn together into the beam while the paper sinks, over two screens, into the
 * deep blue of the ribbon's night. There the effects glow: the line of light with its nodes,
 * the stars of the rewards, an arch closing into the coin, the blinds behind the rank. The night
 * then stays to the end: the calm sections, the closing login over the helix of light strands
 * (the ribbon's night form) and, last, the dawn on a distant horizon under the glowing key word.
 * At most two WebGL contexts live at once: the sky, plus the coin or the finale near their parts.
 */
function Landing({ onPendingChange }: { onPendingChange: (pending: boolean) => void }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const heroRef = useRef<HTMLElement>(null)
  const headerRef = useRef<HTMLElement>(null)
  const reduced = useReducedMotion()
  const [webgl] = useState(hasWebGL2)
  const live = webgl && !reduced
  const [theme] = useTheme()
  const dark = theme === 'dark'
  const drive = useRef(
    skyDrive(prefersReducedMotion() ? {} : { reveal: 0, threadDraw: 0, glint: 0 }),
  )
  const blinds = useRef(blindsDrive())
  const finale = useRef(finaleDrive(prefersReducedMotion()))
  const scrollTo = useScrollTo()

  const onAnchor = (event: MouseEvent<HTMLAnchorElement>, href: string) => {
    event.preventDefault()
    scrollTo(href)
    history.replaceState(history.state, '', href)
  }

  const focusLogin = () => {
    if (heroRef.current) scrollTo(heroRef.current)
    document.getElementById(HERO_LOGIN_ID)?.focus({ preventScroll: true })
  }

  // The header steps aside while reading down and returns on the way up. Its colours follow the
  // ground under it (paper until the dusk has fallen, the night after; always the night in dark
  // mode), crossfading in CSS. The html ground follows the bottom of the screen, so overscrolling
  // past the end shows the night, and the top of the page the paper.
  useEffect(() => {
    const header = headerRef.current
    const root = rootRef.current
    if (!header || !root) return
    const dusk = root.querySelector('[data-sky-dusk]')
    let lastY = window.scrollY
    let frame = 0
    const update = () => {
      frame = 0
      const y = window.scrollY
      header.dataset.scrolled = String(y > 24)
      const line = header.getBoundingClientRect().height / 2
      header.dataset.tone = dark || through(dusk, line) > 0.5 ? 'night' : 'paper'
      document.documentElement.dataset.blaskGround =
        through(dusk, window.innerHeight) > 0.5 ? 'night' : 'paper'
      if (Math.abs(y - lastY) > 4) {
        const down = y > lastY
        header.dataset.hidden = String(down && y > 240 && !header.matches(':focus-within'))
        lastY = y
      }
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    window.addEventListener('scroll', onScroll, { passive: true })
    window.addEventListener('resize', onScroll)
    return () => {
      cancelAnimationFrame(frame)
      window.removeEventListener('scroll', onScroll)
      window.removeEventListener('resize', onScroll)
      delete document.documentElement.dataset.blaskGround
    }
  }, [dark])

  useGSAP(
    () => {
      const mm = gsap.matchMedia()
      mm.add('(prefers-reduced-motion: no-preference)', () => {
        const d = drive.current
        // The load moment: the ribbon pours in, the headline rises, the card comes, then the
        // thread of light is drawn along the glass and, last, the glint of the beam behind it.
        const split = SplitText.create('.blask-hero-title', {
          type: 'lines',
          mask: 'lines',
          linesClass: 'blask-hero-line',
        })
        const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
        tl.fromTo(d, { reveal: 0 }, { reveal: 1, duration: 1.6, ease: 'power3.inOut' }, 0)
          .from(split.lines, { yPercent: 105, duration: 1.2, stagger: 0.09 }, 0.25)
          .from('.blask-hero-lede', { y: 18, opacity: 0, duration: 1 }, 0.55)
          .from('.blask-hero-actions', { y: 14, opacity: 0, duration: 1 }, 0.65)
          .from('.blask-hero-card', { y: 24, opacity: 0, duration: 1.1 }, 0.95)
          .from(headerRef.current, { opacity: 0, duration: 0.8, ease: 'power2.out' }, 0.1)
          .fromTo(
            d,
            { threadDraw: 0 },
            { threadDraw: 1, duration: 1.5, ease: 'power2.inOut' },
            1.05,
          )
          .fromTo(d, { glint: 0 }, { glint: 1, duration: 1.8, ease: 'power2.out' }, 1.9)

        // Scrolling quickens the liquid.
        ScrollTrigger.create({
          trigger: heroRef.current,
          start: 'top top',
          end: 'bottom top',
          onUpdate: (self) => {
            boostFlow(d, Math.min(2.4, Math.abs(self.getVelocity()) / 800))
          },
        })

        // The ripple under the pointer fades in on the first mouse move only.
        const onMove = (event: PointerEvent) => {
          if (event.pointerType !== 'mouse') return
          gsap.to(d, { pointer: 1, duration: 1.2, ease: 'power2.out' })
          window.removeEventListener('pointermove', onMove)
        }
        window.addEventListener('pointermove', onMove, { passive: true })

        // Every chapter title arrives the way the headline does: lines slide up out of masks.
        const titles = gsap.utils.toArray<HTMLElement>('[data-mask-title]').map((title) => {
          const lines = SplitText.create(title, { type: 'lines', mask: 'lines' })
          gsap.from(lines.lines, {
            yPercent: 105,
            duration: 1.1,
            stagger: 0.08,
            ease: 'expo.out',
            scrollTrigger: { trigger: title, start: 'top 88%', once: true },
          })
          return lines
        })

        return () => {
          window.removeEventListener('pointermove', onMove)
          split.revert()
          titles.forEach((lines) => lines.revert())
          Object.assign(d, { reveal: 1, threadDraw: 1, glint: 1 })
        }
      })
      return () => mm.revert()
    },
    { scope: rootRef },
  )

  // The light answers the login: the thread brightens and the glint rises softly when the panel
  // opens; a refusal dims the thread for a breath (the message and the fields say the rest).
  const onAnswer = useCallback((accepted: boolean) => {
    if (prefersReducedMotion()) return
    const d = drive.current
    if (accepted) {
      gsap.to(d, { thread: 2.2, duration: 0.7, ease: 'power2.out', overwrite: 'auto' })
      boostFlow(d, 2.2)
    } else {
      gsap
        .timeline()
        .to(d, { thread: -0.6, duration: 0.45, ease: 'power2.out', overwrite: 'auto' })
        .to(d, { thread: 0, duration: 1.1, ease: 'power2.inOut' })
    }
  }, [])

  return (
    <div
      ref={rootRef}
      className="blask-root blask-landing min-h-dvh"
      data-sky={live ? 'live' : 'still'}
    >
      <span data-sky-axis aria-hidden="true" className="blask-axis" />
      <FinaleSky rootRef={rootRef} live={live} webgl={webgl} drive={finale} />
      <a href="#blask-main" className="blask-skip blask-btn blask-btn-primary">
        Przejdź do treści
      </a>
      <header
        ref={headerRef}
        data-scrolled="false"
        data-hidden="false"
        data-tone="paper"
        className="blask-header"
      >
        <div className="mx-auto flex h-16 max-w-[1360px] items-center justify-between gap-6 px-[var(--blask-gutter)] lg:h-20">
          <a
            href="/login"
            className="rounded-md text-current no-underline max-sm:-my-1.5 max-sm:py-1.5"
            aria-label={`${PRODUCT.name}, początek strony`}
            onClick={(event) => {
              event.preventDefault()
              if (rootRef.current) scrollTo(rootRef.current)
            }}
          >
            <Wordmark />
          </a>
          <nav aria-label="Główna" className="flex items-center gap-2 sm:gap-6">
            <ul className="hidden items-center gap-6 md:flex">
              {NAV.map((item) => (
                <li key={item.href}>
                  <a
                    href={item.href}
                    className="blask-headlink"
                    onClick={(event) => onAnchor(event, item.href)}
                  >
                    {item.label}
                  </a>
                </li>
              ))}
            </ul>
            <ThemeSwitch />
            <button type="button" className="blask-btn blask-btn-primary" onClick={focusLogin}>
              Zaloguj się
            </button>
          </nav>
        </div>
      </header>

      <main id="blask-main">
        {/* The story: clipped, so the sticky sky never paints past its last chapter. */}
        <div data-sky-story className="relative overflow-clip">
          {live && (
            <LandingSky
              rootRef={rootRef}
              drive={drive}
              blinds={blinds}
              dark={dark}
              className="pointer-events-none sticky top-0 z-0 -mb-[100lvh] h-[100lvh]"
            />
          )}
          <div className="relative z-[1]">
            <section
              ref={heroRef}
              aria-labelledby="blask-hero-title"
              className="blask-hero relative isolate overflow-hidden pt-28 pb-16 lg:flex lg:min-h-[max(100svh,46rem)] lg:items-start lg:pt-[max(8.5rem,15vh)] lg:pb-0"
            >
              {/* One still frame; a mode switch repaints it as a fresh frame. */}
              {!live && (
                <LandingSky
                  key={theme}
                  rootRef={rootRef}
                  drive={drive}
                  dark={dark}
                  className="pointer-events-none absolute inset-0 -z-10"
                />
              )}
              <div className="mx-auto grid w-full max-w-[1360px] gap-10 px-[var(--blask-gutter)] lg:grid-cols-12 lg:gap-8">
                <div className="lg:col-span-8">
                  <div data-sky-calm className="w-fit max-w-full">
                    <h1 id="blask-hero-title" className="blask-display blask-h1 blask-hero-title">
                      Grywalizacja zajęć bez arkuszy.
                    </h1>
                    <p className="blask-lede blask-hero-lede mt-7">{PRODUCT.pitch}</p>
                    <div className="blask-hero-actions mt-8 flex flex-wrap items-center gap-3">
                      <a
                        href="#droga"
                        className="blask-btn blask-btn-outline no-underline"
                        onClick={(event) => onAnchor(event, '#droga')}
                      >
                        Zobacz, jak to działa
                      </a>
                    </div>
                  </div>
                  <div data-sky-anchor aria-hidden="true" className="h-[300px] lg:hidden" />
                </div>
                <div className="blask-hero-card relative lg:col-span-4 lg:mt-6">
                  <LoginCard
                    loginId={HERO_LOGIN_ID}
                    onAnswer={onAnswer}
                    onPendingChange={onPendingChange}
                  />
                </div>
              </div>
              <div
                data-sky-anchor
                aria-hidden="true"
                className="absolute inset-x-0 bottom-[33%] hidden h-px lg:block"
              />
            </section>

            <LandingDroga live={live} drive={drive} />
            <div className="blask-on-night">
              <LandingNagrody live={live} drive={drive} />
              <LandingPunkty live={live} webgl={webgl} drive={drive} />
            </div>
            <LandingRanga live={live} blinds={blinds} />
            <div className="blask-on-night">
              <Tablica live={live} />
              <Roles />
              <Faq />
            </div>
          </div>
        </div>

        <LandingClosing drive={finale} onPendingChange={onPendingChange} />
      </main>

      <FinaleFooter />
    </div>
  )
}
