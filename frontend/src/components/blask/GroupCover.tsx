import { useId, useMemo } from 'react'
import { groupTone, seeded } from './groupTone'

const W = 400
const H = 200

/** compact: a card cover or a list thumbnail (5:2); large: a page header strip (7:1). */
export type GroupCoverSize = 'compact' | 'large'

const ASPECT: Record<GroupCoverSize, number> = { compact: 2.5, large: 7 }
const BOX: Record<GroupCoverSize, string> = {
  compact: 'aspect-[5/2] w-full',
  large: 'aspect-[7/1] w-full',
}

/** A smooth edge across the cover: y(x) as one cubic, sampled at both ends and two handles. */
function edge(y1: number, c1: number, c2: number) {
  return `C${W * 0.33},${c1} ${W * 0.66},${c2} ${W + 30},${y1}`
}

/** Four-pointed glint centred at the origin. */
function glintPath(r: number) {
  const k = r * 0.2
  return `M0,${-r} L${k},${-k} L${r},0 L${k},${k} L0,${r} L${-k},${k} L${-r},0 L${-k},${-k} Z`
}

/**
 * A group's cover art, ported from the lab's course cover: a static fragment of the ribbon in the
 * group's colour from the one Blask family (a folded band of liquid glass on paper with a deep
 * pool, a white crease and a faint reflection). Shape and colour come only from `seed` (use the
 * group id, which never changes), so a group always looks the same; light and dark follow the
 * theme by themselves. Pure SVG, decorative (`aria-hidden`); it fills its box and crops to it.
 *
 * `progress` (0–1, real data only, e.g. the way to the next rank) adds the vertical beam of light:
 * its length is the progress and its head glows where it stops; at 1 pearl glints appear. Without
 * it the cover is the ribbon alone.
 */
export function GroupCover({
  seed,
  size = 'compact',
  progress,
  className = BOX[size],
  aspect = ASPECT[size],
}: {
  seed: string
  size?: GroupCoverSize
  progress?: number
  /** Sizes the box; defaults to full width at the size's aspect ratio. Add rounding here. */
  className?: string
  /** The box's width / height when `className` changes it, so the beam is measured on what shows. */
  aspect?: number
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const art = useMemo(() => {
    const rand = seeded(seed)
    const center = 90 + rand() * 16
    const tilt = (rand() - 0.5) * 34
    const thick = 58 + rand() * 26
    const wave = 12 + rand() * 16
    const topL = center - thick / 2 - tilt / 2
    const topR = center - thick / 2 + tilt / 2
    const top = `M-30,${topL} ${edge(topR, topL - wave, topR + wave * 0.8)}`
    const botL = topL + thick * (0.9 + rand() * 0.25)
    const botR = topR + thick * (0.85 + rand() * 0.3)
    const bottom = `L${W + 30},${botR} C${W * 0.66},${botR + wave * 0.6} ${W * 0.33},${botL - wave * 0.7} -30,${botL} Z`
    const creaseL = (topL + botL) / 2 + (rand() - 0.5) * 16
    const creaseR = (topR + botR) / 2 + (rand() - 0.5) * 16
    const crease = `M-30,${creaseL} ${edge(creaseR, creaseL - wave * 0.4, creaseR + wave * 0.5)}`
    const lip = `M-30,${botL} C${W * 0.33},${botL - wave * 0.7} ${W * 0.66},${botR + wave * 0.6} ${W + 30},${botR}`
    const beamX = W * (0.6 + rand() * 0.22)
    // Where the beam meets the band (linear between the ends is close enough for a glow).
    const across = beamX / W
    const bandTop = topL + (topR - topL) * across
    const bandBottom = botL + (botR - botL) * across
    return {
      band: `${top} ${bottom}`,
      crease,
      lip,
      pool: { x: 0.25 + rand() * 0.5, y: 0.35 + rand() * 0.3 },
      noise: Math.floor(rand() * 90) + 1,
      reflectionY: Math.max(botL, botR) + 22,
      stops: [0.12 + rand() * 0.1, 0.38 + rand() * 0.12, 0.62 + rand() * 0.1],
      beamX,
      caustic: (bandTop + bandBottom) / 2,
      glints: [
        { x: beamX + 14 + rand() * 10, y: bandTop + 4, r: 9 },
        { x: W * (0.12 + rand() * 0.2), y: topL + 6 + rand() * 10, r: 6 },
        { x: beamX - 46 - rand() * 30, y: bandBottom - 8, r: 5 },
        { x: W * (0.86 + rand() * 0.08), y: topR + thick * 0.4, r: 4 },
      ],
      colors: groupTone(seed),
    }
  }, [seed])

  // The beam runs over the visible height of the sliced cover.
  const visible = Math.min(H, W / aspect)
  const top = (H - visible) / 2
  const share = progress === undefined ? null : Math.max(0, Math.min(1, progress))
  const beamEnd = top + visible * (share ?? 0)

  const { colors } = art
  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
      className={`block ${className}`}
    >
      <defs>
        <linearGradient id={`${id}-band`} x1="0" y1="0" x2="1" y2="0.35">
          <stop offset="0" style={{ stopColor: colors.light }} />
          <stop offset={art.stops[0]} style={{ stopColor: colors.mid }} />
          <stop offset={art.stops[1]} style={{ stopColor: colors.deep }} />
          <stop offset={art.stops[2]} style={{ stopColor: colors.mid }} />
          <stop offset="1" style={{ stopColor: colors.light }} />
        </linearGradient>
        <radialGradient
          id={`${id}-pool`}
          cx={art.pool.x}
          cy={art.pool.y}
          r="0.32"
          gradientTransform={`translate(${art.pool.x} ${art.pool.y}) scale(1.6 0.7) translate(${-art.pool.x} ${-art.pool.y})`}
        >
          <stop offset="0" style={{ stopColor: colors.abyss, stopOpacity: 0.95 }} />
          <stop offset="0.55" style={{ stopColor: colors.deep, stopOpacity: 0.45 }} />
          <stop offset="1" style={{ stopColor: colors.deep, stopOpacity: 0 }} />
        </radialGradient>
        <linearGradient id={`${id}-sheen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="0.35" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${id}-reflect`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" style={{ stopColor: colors.deep, stopOpacity: 0.55 }} />
          <stop offset="1" style={{ stopColor: colors.mid, stopOpacity: 0 }} />
        </radialGradient>
        <filter id={`${id}-liquid`} x="-10%" y="-20%" width="120%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.006 0.018"
            numOctaves="2"
            seed={art.noise}
            result="noise"
          />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="38" />
        </filter>
        <filter id={`${id}-soft`} x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="9" />
        </filter>
        <clipPath id={`${id}-clip`}>
          <path d={art.band} />
        </clipPath>
        <linearGradient id={`${id}-beam`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0" />
          <stop offset="0.25" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" />
        </linearGradient>
        <linearGradient id={`${id}-glint`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.55" stopColor="#fbfaff" />
          <stop offset="1" stopColor="#afc0ff" />
        </linearGradient>
        <filter
          id={`${id}-glow`}
          filterUnits="userSpaceOnUse"
          x="-40"
          y="-40"
          width={W + 80}
          height={H + 80}
        >
          <feGaussianBlur stdDeviation="6" />
        </filter>
      </defs>
      <rect width={W} height={H} style={{ fill: colors.tint }} />
      <ellipse
        cx={W * 0.55}
        cy={art.reflectionY}
        rx={W * 0.36}
        ry="18"
        fill={`url(#${id}-reflect)`}
        filter={`url(#${id}-soft)`}
      />
      <path d={art.band} fill={`url(#${id}-band)`} />
      <g clipPath={`url(#${id}-clip)`}>
        {/* The interior flows; the edges stay smooth like a surface of glass. */}
        <g filter={`url(#${id}-liquid)`}>
          <rect x="-20" y="-20" width={W + 40} height={H + 40} fill={`url(#${id}-pool)`} />
          <ellipse
            cx={W * (1 - art.pool.x)}
            cy={H * 0.42}
            rx={W * 0.22}
            ry="10"
            fill="#ffffff"
            opacity="0.55"
            filter={`url(#${id}-soft)`}
          />
        </g>
        <rect width={W} height={H} fill={`url(#${id}-sheen)`} opacity="0.6" />
        <path
          d={art.crease}
          fill="none"
          stroke="#ffffff"
          strokeWidth="9"
          strokeOpacity="0.35"
          filter={`url(#${id}-soft)`}
        />
        <path d={art.crease} fill="none" stroke="#ffffff" strokeWidth="1.5" strokeOpacity="0.9" />
      </g>
      <path d={art.lip} fill="none" stroke="#ffffff" strokeWidth="1.4" strokeOpacity="0.85" />
      {share !== null && (
        // The unlit rest of the way: a hairline of the group's hue.
        <line
          x1={art.beamX}
          x2={art.beamX}
          y1={beamEnd}
          y2={top + visible}
          style={{ stroke: colors.deep }}
          strokeOpacity="0.22"
          strokeWidth="1"
          strokeDasharray="2 4"
        />
      )}
      {share !== null && share > 0 && (
        <g>
          <rect
            x={art.beamX - 9}
            y={top - 10}
            width="18"
            height={beamEnd - top + 10}
            style={{ fill: colors.mid }}
            opacity="0.28"
            filter={`url(#${id}-glow)`}
          />
          <rect
            x={art.beamX - 1.25}
            y={top - 10}
            width="2.5"
            height={beamEnd - top + 10}
            fill={`url(#${id}-beam)`}
          />
          {/* Light through the glass: a soft bloom where the beam crosses the band. */}
          {beamEnd > art.caustic && (
            <ellipse
              cx={art.beamX}
              cy={art.caustic}
              rx="22"
              ry="9"
              fill="#ffffff"
              opacity="0.7"
              filter={`url(#${id}-glow)`}
            />
          )}
          <circle
            cx={art.beamX}
            cy={beamEnd}
            r="11"
            style={{ fill: colors.mid }}
            opacity="0.35"
            filter={`url(#${id}-glow)`}
          />
          <circle cx={art.beamX} cy={beamEnd} r="3.2" fill="#ffffff" />
          <circle
            cx={art.beamX}
            cy={beamEnd}
            r="5.5"
            fill="none"
            stroke="#ffffff"
            strokeOpacity="0.7"
          />
        </g>
      )}
      {share === 1 &&
        art.glints.map((glint, i) => (
          <g key={i} transform={`translate(${glint.x} ${glint.y})`}>
            <circle r={glint.r * 1.5} fill="#6c3bf4" opacity="0.35" filter={`url(#${id}-glow)`} />
            <path d={glintPath(glint.r)} fill={`url(#${id}-glint)`} />
            <circle r={glint.r * 0.2} fill="#ffffff" />
          </g>
        ))}
    </svg>
  )
}
