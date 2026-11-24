import type { ReactNode } from 'react'
import { AlertIcon, CheckCircleIcon, InfoIcon } from './icons'

export type NoticeTone = 'success' | 'info' | 'partial' | 'error'

const ICON = {
  success: CheckCircleIcon,
  info: InfoIcon,
  partial: AlertIcon,
  error: AlertIcon,
} as const

/**
 * A short message in the Blask scope; the tone is carried by the icon and the words, never by
 * colour alone. Errors are announced at once (role alert), the rest politely (role status); pass
 * `announce={false}` when the notice sits inside a live region that already announces it.
 */
export function BlaskNotice({
  tone,
  title,
  children,
  announce = true,
  className = '',
}: {
  tone: NoticeTone
  /** Bold first line, e.g. the outcome of a batch; `children` add the details. */
  title?: string
  children?: ReactNode
  announce?: boolean
  className?: string
}) {
  const Icon = ICON[tone]
  return (
    <div
      role={announce ? (tone === 'error' ? 'alert' : 'status') : undefined}
      data-tone={tone}
      className={`blask-notice ${className}`}
    >
      <Icon className="mt-0.5 size-[1.125rem]" />
      <div className="flex min-w-0 flex-col gap-1">
        {title !== undefined && <p className="font-semibold">{title}</p>}
        {children}
      </div>
    </div>
  )
}
