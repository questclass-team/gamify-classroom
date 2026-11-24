import { gsap } from '../../lib/gsap'

/**
 * Numbers GSAP and ScrollTrigger write; the sky turns them into uniforms every frame, together
 * with positions it reads from the page (anchors, the ground, the line's head, the last chapter).
 */
export interface SkyDrive {
  /** Load: pour-in of the ribbon, draw-in of its thread, the glint behind it. */
  reveal: number
  threadDraw: number
  glint: number
  /** 0 until the mouse moves. */
  pointer: number
  /** The signature, 0–1 (scrubbed with smoothing): the ribbon becomes the beam of light. */
  beam: number
  /** 0–1 soft glow of the light's answers (the landing, the full coin, a new rank). */
  flare: number
  /** Extra brightness of the thread (the login's answer; negative dims it). */
  thread: number
  /** Extra flow speed of the ribbon (scroll velocity, the login's answer). */
  boost: number
}

export function skyDrive(overrides: Partial<SkyDrive> = {}): SkyDrive {
  return {
    reveal: 1,
    threadDraw: 1,
    glint: 1,
    pointer: 0,
    beam: 0,
    flare: 0,
    thread: 0,
    boost: 0,
    ...overrides,
  }
}

/** Quickens the liquid to at least `amount`, then lets it settle back to its own pace. */
export function boostFlow(drive: { boost: number }, amount: number, duration = 1.6) {
  if (amount <= drive.boost + 0.05) return
  gsap.fromTo(
    drive,
    { boost: amount },
    { boost: 0, duration, ease: 'power2.out', overwrite: 'auto' },
  )
}

/**
 * The one way light answers on this page: a soft glow that fades in and settles, never a flash.
 * Works on any object with a `flare` number (the sky's drive, the coin's state).
 */
export function glowPulse(target: { flare: number }, peak = 1) {
  gsap
    .timeline()
    .to(target, { flare: peak, duration: 0.65, ease: 'power2.out', overwrite: 'auto' })
    .to(target, { flare: 0, duration: 1.4, ease: 'power2.inOut' })
}
