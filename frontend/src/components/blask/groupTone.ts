/**
 * Colours and randomness of a group's cover (GroupCover), derived only from a stable seed (the
 * group id). Every group sits on Blask's cobalt → iris arc (hue 198–280), told apart by hue and
 * a little lightness; the hues are the lab's course tones.
 */
const TONES = [
  { h: 228, s: 72, l: 56 },
  { h: 262, s: 66, l: 60 },
  { h: 212, s: 74, l: 50 },
  { h: 242, s: 72, l: 64 },
  { h: 280, s: 58, l: 58 },
  { h: 198, s: 72, l: 44 },
] as const

/** FNV-1a hash of the text, the start of every seeded sequence. */
function hash(text: string) {
  let seed = 2166136261
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619)
  return seed
}

/** A small seeded generator (mulberry32): the same text always gives the same numbers in [0, 1). */
export function seeded(text: string) {
  let seed = hash(text)
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export interface GroupTone {
  /** Cover glass, from the paper-side highlight to the deepest fold (which leans toward iris). */
  light: string
  mid: string
  deep: string
  abyss: string
  /** The cover's paper. */
  tint: string
}

/**
 * The group's tone. Colours that change with the theme are `light-dark()` pairs, so they follow
 * `<html data-theme>` (through `color-scheme`) without a re-render: on the evening the cover's
 * paper turns into deep night of the same hue and the glass's pale edge sinks.
 */
export function groupTone(seed: string): GroupTone {
  const { h, s, l } = TONES[(hash(seed) >>> 0) % TONES.length]!
  const pair = (light: string, dark: string) => `light-dark(${light}, ${dark})`
  return {
    light: pair(`hsl(${h} ${s}% 92%)`, `hsl(${h} ${s}% 36%)`),
    mid: `hsl(${h} ${s}% ${l}%)`,
    deep: `hsl(${h + 6} ${s}% ${Math.max(22, l - 26)}%)`,
    abyss: `hsl(${h + 22} ${Math.round(s * 0.8)}% ${Math.max(14, l - 40)}%)`,
    tint: pair(`hsl(${h} 60% 97.5%)`, `hsl(${h} 55% 11%)`),
  }
}
