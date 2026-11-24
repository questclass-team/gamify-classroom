/** What Ranga's scroll writes and the sky's blinds read: the light's sweep and the rank's flare. */
export interface BlindsDrive {
  /** 0–1, the light's position across the blinds (scrubbed). */
  sweep: number
  /** 0–1, one flare when the rank changes. */
  pulse: number
}

export function blindsDrive(): BlindsDrive {
  return { sweep: 0.5, pulse: 0 }
}
