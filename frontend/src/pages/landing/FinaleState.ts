/** What the closing writes and the finale's helix reads. */
export interface FinaleDrive {
  /** 0–1 pour-in of the strands from the left (once, when the closing comes into view). */
  pour: number
  /** Soft glow of the login's answer: positive brightens the strands, negative dims them. */
  flare: number
  /** Extra drift speed of the strands (the login's answer). */
  boost: number
}

export function finaleDrive(still: boolean): FinaleDrive {
  return { pour: still ? 1 : 0, flare: 0, boost: 0 }
}
