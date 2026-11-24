import type { ReactNode } from 'react'
import { BlaskNotice } from './BlaskNotice'
import { Button } from './Button'
import { Dialog } from './Dialog'

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
  /** Called when the dialog closes for any reason (Anuluj, Esc, back gesture, click outside). */
  onClose: () => void
}

/**
 * Confirmation of a destructive action on the kit's Dialog: Anuluj gets the initial focus, the
 * raspberry button confirms; Esc and a click outside close it unless the action is running.
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
  return (
    <Dialog
      open={open}
      onClose={onClose}
      title={title}
      busy={busy}
      footer={
        <>
          <Button variant="quiet" disabled={busy} data-autofocus onClick={onClose}>
            Anuluj
          </Button>
          <Button variant="danger" busy={busy} busyLabel={busyLabel} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="text-[0.9375rem] text-blask-graphite">{children}</div>
        {error !== null && <BlaskNotice tone="error">{error}</BlaskNotice>}
      </div>
    </Dialog>
  )
}
