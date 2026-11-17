import { useEffect, useId, useRef, type ReactNode } from 'react'
import { Alert, Button } from './ui'

interface ConfirmDialogProps {
  open: boolean
  title: string
  children: ReactNode
  confirmLabel: string
  /** Confirm button text while the action runs, e.g. "Usuwanie…". */
  busyLabel: string
  busy?: boolean
  error?: string | null
  onConfirm: () => void
  /** Called when the dialog closes for any reason (Cancel, Esc, back gesture, click outside). */
  onClose: () => void
}

/** Modal confirmation for destructive actions on the native <dialog>; Cancel gets initial focus. */
export function ConfirmDialog({
  open,
  title,
  children,
  confirmLabel,
  busyLabel,
  busy = false,
  error = null,
  onConfirm,
  onClose,
}: ConfirmDialogProps) {
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
      // Light dismiss where supported; Esc and the back gesture close it everywhere.
      {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      className="m-auto w-[min(28rem,calc(100%-2rem))] rounded-ui border border-line bg-surface p-0 text-fg shadow-2xl"
    >
      <div className="flex flex-col gap-4 p-5 sm:p-6">
        <h2 id={titleId} className="text-xl font-semibold tracking-tight">
          {title}
        </h2>
        <div className="text-sm text-muted">{children}</div>
        {error !== null && <Alert tone="error">{error}</Alert>}
        <form method="dialog" className="flex flex-wrap justify-end gap-3">
          <Button type="submit" variant="secondary" disabled={busy} autoFocus>
            Anuluj
          </Button>
          <Button variant="danger" disabled={busy} onClick={onConfirm}>
            {busy ? busyLabel : confirmLabel}
          </Button>
        </form>
      </div>
    </dialog>
  )
}
