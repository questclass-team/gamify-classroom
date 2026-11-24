/**
 * The avatar artwork as data (ported unchanged from the Blask lab), rendered by `Avatar.tsx`.
 *
 * Every avatar is a liquid-glass disc in the BadgeMark spirit: a body of light from a pale
 * highlight through its tone into iris, a pearl rim, a shine across the top and a reflection low
 * on the right, with a pearl line-art glyph inside. The six tones step from azure-cobalt to
 * violet, so neighbours on a ranking are easy to tell apart. The neutral mark (no avatar chosen)
 * is an empty pale disc with a faint four-point star: no glass, no glyph.
 *
 * Box: 48 × 48, disc radius 21 around (24, 24); glyphs sit in about 12…36 (the inner circle of
 * radius 13), drawn with round caps and joins in one stroke weight per size.
 */
import type { AvatarKey } from '../../api/types'
import { starPath } from './starShape'

export type AvatarTheme = 'light' | 'dark'

export interface ArtNode {
  tag: 'circle' | 'path' | 'g' | 'radialGradient' | 'linearGradient' | 'stop'
  /** SVG attribute names as written in SVG (`stroke-width`, `stop-color`). */
  attrs: Record<string, string | number>
  children?: ArtNode[]
}

export const VIEWBOX = '0 0 48 48'
const C = 24
const R = 21

/* ------------------------------------------------------------------------------------------ */
/* Tones                                                                                       */
/* ------------------------------------------------------------------------------------------ */

/** The six body tones (hue of the body; the deepest stop leans further toward iris). */
export const TONES = {
  azure: 214,
  cobalt: 226,
  blue: 236,
  indigo: 248,
  iris: 260,
  violet: 266,
} as const

export type ToneName = keyof typeof TONES

/** Tone per avatar: no two neighbours in the picker order share one. */
export const AVATAR_TONE: Record<AvatarKey, ToneName> = {
  fox: 'blue',
  owl: 'violet',
  hedgehog: 'cobalt',
  cat: 'iris',
  wolf: 'azure',
  raven: 'indigo',
  dragon: 'azure',
  phoenix: 'iris',
  comet: 'cobalt',
  star: 'blue',
  moon: 'violet',
  planet: 'indigo',
  spark: 'azure',
  aurora: 'iris',
  wave: 'cobalt',
  galaxy: 'blue',
}

/** HSL to hex: plain colour values in the SVG attributes. */
function hex(h: number, s: number, l: number) {
  const a = (s / 100) * Math.min(l / 100, 1 - l / 100)
  const channel = (n: number) => {
    const k = (n + h / 30) % 12
    const v = l / 100 - a * Math.max(-1, Math.min(k - 3, 9 - k, 1))
    return Math.round(v * 255)
      .toString(16)
      .padStart(2, '0')
  }
  return `#${channel(0)}${channel(8)}${channel(4)}`
}

/** The body gradient: a pale highlight top left, the tone through the middle, iris at the edge. */
function bodyStops(h: number): [number, string][] {
  return [
    [0, hex(h, 100, 91)],
    [0.16, hex(h, 96, 76)],
    [0.42, hex(h, 92, 60)],
    [0.76, hex(h + 6, 86, 50)],
    [1, hex(Math.min(h + 18, 268), 80, 44)],
  ]
}

/** What changes with the surface: the hairline that cuts the disc out of the page, the null mark. */
const SURFACE: Record<
  AvatarTheme,
  {
    edge: string
    edgeOpacity: number
    rimOpacity: number
    nullFill: string
    nullRing: string
    nullStar: string
  }
> = {
  light: {
    edge: '#1d29d6',
    edgeOpacity: 0.2,
    rimOpacity: 0.95,
    nullFill: '#eef0fe',
    nullRing: '#afc0ff',
    nullStar: '#8e9bff',
  },
  dark: {
    edge: '#8e9bff',
    edgeOpacity: 0.4,
    rimOpacity: 0.8,
    nullFill: '#111a52',
    nullRing: '#3d4aa8',
    nullStar: '#6c7bff',
  },
}

const PEARL = '#fbfaff'

/* ------------------------------------------------------------------------------------------ */
/* Geometry helpers                                                                            */
/* ------------------------------------------------------------------------------------------ */

type Point = [number, number]

const r2 = (n: number) => Math.round(n * 100) / 100

function polyline(points: Point[]) {
  return points.map(([x, y], i) => `${i ? 'L' : 'M'}${r2(x)} ${r2(y)}`).join(' ')
}

/** Splits sampled points into runs of kept points (for a line broken where it passes behind). */
function runs(points: Point[], keep: (p: Point) => boolean) {
  const out: Point[][] = []
  let run: Point[] = []
  for (const p of points) {
    if (keep(p)) run.push(p)
    else if (run.length) {
      out.push(run)
      run = []
    }
  }
  if (run.length) out.push(run)
  return out.filter((r) => r.length > 1).map(polyline)
}

/** A five-point star with rounded joins (the stroke rounds them), centre (cx, cy). */
function fivePointStar(cx: number, cy: number, outer: number, inner: number) {
  const points: Point[] = []
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5
    const r = i % 2 ? inner : outer
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r])
  }
  return `${polyline(points)}Z`
}

/** A crescent: the outer circle with a second circle cut from its upper right. */
function crescent(o: Point, ro: number, c: Point, rc: number) {
  const dx = c[0] - o[0]
  const dy = c[1] - o[1]
  const d = Math.hypot(dx, dy)
  const a = (ro * ro - rc * rc + d * d) / (2 * d)
  const h = Math.sqrt(ro * ro - a * a)
  const mx = o[0] + (a * dx) / d
  const my = o[1] + (a * dy) / d
  const p1: Point = [mx + (h * dy) / d, my - (h * dx) / d]
  const p2: Point = [mx - (h * dy) / d, my + (h * dx) / d]
  return `M${r2(p1[0])} ${r2(p1[1])} A${ro} ${ro} 0 1 0 ${r2(p2[0])} ${r2(p2[1])} A${rc} ${rc} 0 0 1 ${r2(p1[0])} ${r2(p1[1])}Z`
}

/** A circle as a stroked path (two half arcs). */
function ring(cx: number, cy: number, r: number) {
  return `M${cx - r} ${cy} A${r} ${r} 0 1 0 ${cx + r} ${cy} A${r} ${r} 0 1 0 ${cx - r} ${cy}Z`
}

/**
 * A ringed planet: the ring's far half is broken where the planet hides it, and the planet's
 * outline is broken where the ring's near half passes in front of it.
 */
function planet() {
  const [cx, cy, pr] = [24, 24.4, 7.4]
  const [a, b, tilt] = [15, 4.6, (-20 * Math.PI) / 180]
  const ring = (t: number): Point => {
    const x = Math.cos(t) * a
    const y = Math.sin(t) * b
    return [
      cx + x * Math.cos(tilt) - y * Math.sin(tilt),
      cy + x * Math.sin(tilt) + y * Math.cos(tilt),
    ]
  }
  const steps = 96
  const near: Point[] = []
  const far: Point[] = []
  for (let i = 0; i <= steps / 2; i++) near.push(ring((i / steps) * 2 * Math.PI))
  for (let i = steps / 2; i <= steps; i++) far.push(ring((i / steps) * 2 * Math.PI))
  const gap = 2.2
  const farRuns = runs(far, ([x, y]) => Math.hypot(x - cx, y - cy) > pr + gap)
  const disc: Point[] = []
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * 2 * Math.PI - Math.PI / 2
    disc.push([cx + Math.cos(t) * pr, cy + Math.sin(t) * pr])
  }
  const discRuns = runs(disc, ([x, y]) =>
    near.every(([nx, ny]) => Math.hypot(nx - x, ny - y) > gap),
  )
  return [polyline(near), ...farRuns, ...discRuns]
}

/**
 * A spiral galaxy seen at a slant: two arms winding out of the core, squashed into an ellipse and
 * tilted, so it reads as a disc of stars rather than a letter.
 */
function galaxy() {
  const tilt = (-28 * Math.PI) / 180
  const arm = (start: number) => {
    const points: Point[] = []
    for (let i = 0; i <= 40; i++) {
      const t = i / 40
      const angle = start + t * 1.35 * Math.PI
      const r = 3.4 + t * 11.4
      const x = Math.cos(angle) * r
      const y = Math.sin(angle) * r * 0.58
      points.push([
        24 + x * Math.cos(tilt) - y * Math.sin(tilt),
        24 + x * Math.sin(tilt) + y * Math.cos(tilt),
      ])
    }
    return polyline(points)
  }
  return [arm(0), arm(Math.PI)]
}

/* ------------------------------------------------------------------------------------------ */
/* Glyphs                                                                                      */
/* ------------------------------------------------------------------------------------------ */

interface Glyph {
  /** Stroked paths (pearl line art). */
  lines: string[]
  /** Filled pearl shapes: dots as [cx, cy, r] or paths. */
  dots?: [number, number, number][]
  fills?: string[]
}

const GLYPHS: Record<AvatarKey, Glyph> = {
  fox: {
    lines: [
      'M13.6 12.4 L19.6 18.4 H28.4 L34.4 12.4 L34 23 L24 34.4 L14 23 Z',
      'M14 23 L20.4 24.6 L24 29 L27.6 24.6 L34 23',
    ],
    dots: [
      [24, 33.2, 1.6],
      [20, 21.4, 1.3],
      [28, 21.4, 1.3],
    ],
  },
  owl: {
    lines: [
      'M14.8 13.4 L19 16.2 Q24 14.4 29 16.2 L33.2 13.4 L33.4 21 Q34.6 31.4 24 36.2 Q13.4 31.4 14.6 21 Z',
      ring(19.9, 21.8, 3.9),
      ring(28.1, 21.8, 3.9),
      'M22.6 27.4 L24 29.6 L25.4 27.4',
    ],
    dots: [
      [19.9, 21.8, 1.3],
      [28.1, 21.8, 1.3],
    ],
  },
  hedgehog: {
    lines: [
      'M11.4 31.4 L12.6 27 L10.2 24.6 L14.4 23 L13.8 18.8 L18 19.4 L19.4 15.2 L22.6 17.8 L25.8 14.6 L27.6 18.4 L31 17.6 Q35 19.4 36.6 23.4 L39.2 25.6 Q38.4 29.2 34.8 29.6 Q33.6 31.4 31 31.4 Z',
      'M17.4 31.4 V34.6',
      'M28 31.4 V34.6',
    ],
    dots: [[32.6, 22.8, 1.3]],
  },
  cat: {
    lines: [
      'M15.6 18.6 L15 11.8 L20.4 15.2 Q24 14.2 27.6 15.2 L33 11.8 L32.4 18.6 Q35 23.6 32.6 28.6 Q29.6 33.4 24 33.4 Q18.4 33.4 15.4 28.6 Q13 23.6 15.6 18.6 Z',
      'M8.6 23.8 L12.8 24.8',
      'M8.8 29.4 L13 28',
      'M39.4 23.8 L35.2 24.8',
      'M39.2 29.4 L35 28',
    ],
    dots: [
      [20.2, 22.6, 1.4],
      [27.8, 22.6, 1.4],
    ],
    fills: ['M22.2 26.2 H25.8 L24 28.4 Z'],
  },
  wolf: {
    lines: [
      'M14.6 35.2 Q13.8 28.2 16.8 22.2 L15.6 11.6 L21.8 16.6 Q25 15.8 27 16.8 L36.8 11 L31.4 17.2 L35.4 18.6 Q31 21.8 29.8 25.6 L32.2 27.4 L29.8 28.6 Q30 32.4 32.6 35.2 Z',
    ],
    dots: [[23.4, 20.4, 1.4]],
  },
  raven: {
    lines: [
      'M38 18.4 L31.4 15 Q27.6 13.2 25.2 16.6 Q22.4 21 19 24.2 L10.8 33.2 L18.4 31.4 Q24.4 30.8 28.2 27 Q31.2 23.6 31.2 20.4 Z',
      'M19.6 25.2 Q24.4 25.4 28 21.4',
      'M22.6 31.2 L21.8 35.6',
      'M26.4 29.6 L27.2 35',
    ],
    dots: [[29.2, 17.2, 1.3]],
  },
  dragon: {
    lines: [
      'M12.8 35.6 Q13.4 26 19.4 19.8 L15 11.8 L23.4 16.4 Q28 15 31.4 17.4 L37.4 19.8 Q39.6 22.6 37.2 24.4 L29.8 25.2 Q27.4 29.8 30.8 35.6',
      'M37.6 22.2 L31.4 21.8',
      'M16.2 24.2 L12.4 23.4 L14.2 27',
      'M14.4 29.4 L10.8 29.4 L13.4 32.2',
    ],
    dots: [[25.8, 20, 1.3]],
  },
  phoenix: {
    lines: [
      'M23 21.6 Q17 21 12.4 12.4 Q13.2 20 16.6 23.4 Q13.4 23.6 11.2 22.2 Q14.4 28.2 22.6 27.6',
      'M25 21.6 Q31 21 35.6 12.4 Q34.8 20 31.4 23.4 Q34.6 23.6 36.8 22.2 Q33.6 28.2 25.4 27.6',
      'M23.4 30.2 C21 33.6 17.2 33.6 16.8 30.6',
      'M24.6 30.2 C27 33.6 30.8 33.6 31.2 30.6',
      'M24 30.6 Q25 33.8 23.4 36.8',
    ],
    fills: ['M24 17 C26.2 20.6 26.6 25.8 24 30.8 C21.4 25.8 21.8 20.6 24 17 Z'],
    dots: [[24, 13.6, 2.4]],
  },
  comet: {
    lines: ['M26.4 15 L16.8 24.6', 'M33 22.2 L23.4 31.8', 'M26.6 21.4 L12.4 35.6'],
    dots: [[30.6, 17.4, 5]],
  },
  star: {
    lines: [fivePointStar(24, 25.2, 12.6, 5.6)],
  },
  moon: {
    lines: [crescent([22.6, 25.2], 11.4, [28.6, 19.8], 9.2)],
    fills: [starPath(34.6, 12.4, 3.6)],
    dots: [[36.4, 21, 1.1]],
  },
  planet: {
    lines: planet(),
  },
  spark: {
    lines: ['M27.6 10.8 L16.4 26 H23.4 L20.4 37.2 L32 21.6 H25 Z'],
  },
  aurora: {
    lines: [
      'M11.6 21.4 C15.4 13.6 20.4 22.4 25 15.4 C28 10.8 32.6 12 36.4 15.4',
      'M12.6 27.2 C16.4 20.4 21 27.6 25.8 21.6 C28.8 17.8 33 18.8 35.8 21.4',
      'M10.8 35.4 L17 29.6 L20.6 32.6 L26.6 26.6 L37.2 35.4',
    ],
  },
  wave: {
    lines: [
      'M10.6 31 Q15.6 31 17.8 25.6 Q21.2 17.2 29.4 17.2 Q36.6 17.2 37.4 23.4 Q37.8 27.6 33.8 28 Q30.4 28.2 30.4 25 Q30.4 22.6 33 22.4',
      'M17.8 25.6 Q20.6 29.6 26 29.8',
      'M10.6 36 Q17.2 32.8 24 35.6 Q30.8 38.4 37.4 35.2',
    ],
  },
  galaxy: {
    lines: galaxy(),
    dots: [
      [24, 24, 2.8],
      [35.4, 14, 1.2],
      [13, 33.6, 1.1],
    ],
  },
}

/** One stroke weight per size, so the glyphs hold at 24 px and stay fine at 96 px. */
export function glyphStroke(size: number) {
  if (size <= 28) return 3
  if (size <= 44) return 2.7
  if (size <= 72) return 2.5
  return 2.3
}

/* ------------------------------------------------------------------------------------------ */
/* The disc                                                                                    */
/* ------------------------------------------------------------------------------------------ */

const circle = (r: number, attrs: Record<string, string | number> = {}): ArtNode => ({
  tag: 'circle',
  attrs: { cx: C, cy: C, r, ...attrs },
})

const path = (d: string, attrs: Record<string, string | number>): ArtNode => ({
  tag: 'path',
  attrs: { d, ...attrs },
})

const stop = (offset: number, color: string, opacity = 1): ArtNode => ({
  tag: 'stop',
  attrs: { offset, 'stop-color': color, ...(opacity === 1 ? {} : { 'stop-opacity': opacity }) },
})

/**
 * The avatar inside a 48 × 48 `<svg>`: its gradients (`defs`) and its drawing (`nodes`). `uid`
 * makes the gradient ids unique per instance; `size` is the rendered size in px (it picks the
 * glyph's stroke weight).
 */
export function avatarArt(
  key: AvatarKey | null,
  { uid, theme, size }: { uid: string; theme: AvatarTheme; size: number },
): { defs: ArtNode[]; nodes: ArtNode[] } {
  const surface = SURFACE[theme]

  if (key === null)
    return {
      defs: [],
      nodes: [
        circle(R, { fill: surface.nullFill }),
        circle(R - 0.6, { fill: 'none', stroke: surface.nullRing, 'stroke-width': 1.2 }),
        path(starPath(C, C, 8.5), { fill: surface.nullStar, 'fill-opacity': 0.75 }),
        circle(1.4, { fill: surface.nullFill }),
      ],
    }

  const h = TONES[AVATAR_TONE[key]]
  const glyph = GLYPHS[key]
  const ids = { body: `${uid}-body`, pool: `${uid}-pool`, shine: `${uid}-shine` }
  const width = glyphStroke(size)

  const defs: ArtNode[] = [
    {
      tag: 'radialGradient',
      attrs: { id: ids.body, cx: 0.32, cy: 0.24, r: 0.92 },
      children: bodyStops(h).map(([offset, color]) => stop(offset, color)),
    },
    {
      // Light gathers low on the disc, as in a drop of glass.
      tag: 'radialGradient',
      attrs: { id: ids.pool, cx: 0.62, cy: 1, r: 0.55 },
      children: [stop(0, hex(h + 10, 100, 82), 0.5), stop(1, hex(h + 10, 100, 82), 0)],
    },
    {
      tag: 'linearGradient',
      attrs: { id: ids.shine, x1: 0, y1: 0, x2: 0, y2: 1 },
      children: [stop(0, '#ffffff', 0.85), stop(1, '#ffffff', 0)],
    },
  ]

  const nodes: ArtNode[] = [
    circle(R + 1.6, {
      fill: 'none',
      stroke: surface.edge,
      'stroke-opacity': surface.edgeOpacity,
      'stroke-width': 1,
    }),
    circle(R, { fill: `url(#${ids.body})` }),
    circle(R, { fill: `url(#${ids.pool})` }),
    // The shine: a thin lens of light across the top, above the glyph.
    path(
      'M10.4 15.6 C14 9.4 20.6 6.2 27.4 6.8 C31.4 7.2 34.6 8.8 36.8 11 C30.4 9.6 23 10 16.8 12.6 C14.4 13.6 12.2 14.6 10.4 15.6 Z',
      {
        fill: `url(#${ids.shine})`,
      },
    ),
    // The reflection low on the right, along the rim.
    path('M27.6 40.6 C33 39.4 37.6 35.8 39.8 30.6', {
      fill: 'none',
      stroke: '#ffffff',
      'stroke-opacity': 0.55,
      'stroke-width': 1.1,
      'stroke-linecap': 'round',
    }),
    circle(R - 0.2, {
      fill: 'none',
      stroke: PEARL,
      'stroke-opacity': surface.rimOpacity,
      'stroke-width': 1.5,
    }),
    {
      tag: 'g',
      attrs: {
        fill: 'none',
        stroke: PEARL,
        'stroke-width': width,
        'stroke-linecap': 'round',
        'stroke-linejoin': 'round',
      },
      children: glyph.lines.map((d) => path(d, {})),
    },
    {
      tag: 'g',
      attrs: { fill: PEARL },
      children: [
        ...(glyph.fills ?? []).map((d) => path(d, {})),
        ...(glyph.dots ?? []).map(([cx, cy, r]) => ({
          tag: 'circle' as const,
          attrs: { cx, cy, r },
        })),
      ],
    },
  ]
  return { defs, nodes }
}
