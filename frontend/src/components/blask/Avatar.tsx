import { createElement, useId, type ReactNode } from 'react'
import type { AvatarKey } from '../../api/types'
import { useTheme } from '../../lib/theme'
import { avatarArt, VIEWBOX, type ArtNode, type AvatarTheme } from './art'
import { isAvatarKey } from './avatars'

/** SVG attribute names to React props (`stroke-width` → `strokeWidth`). */
const camel = (name: string) => name.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase())

function render(node: ArtNode, key: number): ReactNode {
  const props = Object.fromEntries(Object.entries(node.attrs).map(([k, v]) => [camel(k), v]))
  return createElement(node.tag, { ...props, key }, node.children?.map(render))
}

/**
 * A student's avatar (or the neutral mark for `null` or an unknown key): a liquid-glass disc with
 * a pearl line-art glyph, drawn inline. Decorative by default, because the nickname is written
 * next to it; with `label` it is an image with that name. The disc follows the app's light / dark
 * mode; `theme` pins it to one surface.
 */
export function Avatar({
  avatar,
  size = 40,
  label,
  theme,
  className = '',
}: {
  avatar: AvatarKey | null
  /** Rendered size in px (it also picks the glyph's stroke weight). */
  size?: number
  label?: string
  theme?: AvatarTheme
  className?: string
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const [mode] = useTheme()
  const key = isAvatarKey(avatar) ? avatar : null
  const { defs, nodes } = avatarArt(key, { uid, theme: theme ?? mode, size })

  return (
    <svg
      width={size}
      height={size}
      viewBox={VIEWBOX}
      focusable="false"
      {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': true })}
      className={`flex-none ${className}`}
    >
      {defs.length > 0 && <defs>{defs.map(render)}</defs>}
      {nodes.map(render)}
    </svg>
  )
}
