import { useEffect, useId, useRef, type ReactNode } from 'react'
import { BlaskNotice } from './BlaskNotice'
import { SpinnerIcon } from './icons'

interface BlaskConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Confirm button text while the action runs, e.g. "Cofanie…". */
  busyLabel: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  /** Called when the dialog closes for any reason (Cancel, Esc, back gesture, click outside). */
  onClose: () => void
}

/**
 * Blask version of ConfirmDialog for destructive actions, on the native modal <dialog>: Cancel
 * gets the initial focus, Esc and a click outside close it unless the action is running. Render it
 * inside a `.blask` element so the scope styles apply.
 */
export function BlaskConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: BlaskConfirmDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      className="blask-dialog"
    >
      <div className="flex flex-col gap-4 p-6">
        <h2 id={titleId} className="text-xl leading-tight font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <div className="text-[0.9375rem] text-blask-graphite">{children}</div>
        {error !== null && <BlaskNotice tone="error">{error}</BlaskNotice>}
        <form method="dialog" className="flex flex-wrap justify-end gap-2">
          <button type="submit" className="blask-btn blask-btn-quiet" disabled={busy} autoFocus>
            Anuluj
          </button>
          <button
            type="button"
            className="blask-btn blask-btn-danger"
            data-busy={busy}
            aria-disabled={busy || undefined}
            onClick={() => {
              if (!busy) onConfirm()
            }}
          >
            {busy && <SpinnerIcon />}
            {busy ? busyLabel : confirmLabel}
          </button>
        </form>
      </div>
    </dialog>
  )
}
