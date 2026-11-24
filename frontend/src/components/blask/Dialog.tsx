import { useEffect, useId, useRef, type FormEvent, type ReactNode } from 'react'
import { CloseIcon } from './icons'

/**
 * A modal on the native `<dialog>` (showModal): the page behind is inert, focus is trapped,
 * Esc / the back gesture / a click outside close it, and the browser returns focus to the opener.
 * Open and close it with `open`; `onClose` runs whenever it closes for any reason (also its own
 * close button), so set your `open` state to false there.
 *
 * The control marked `data-autofocus` gets the focus on open (else the close button; React's
 * `autoFocus` does not work in a dialog that mounts closed). While `busy`, it
 * cannot be dismissed. With `onSubmit` the body and footer form one `<form>` (submit buttons in
 * `footer` submit it). Smooth scroll ignores wheel events inside it.
 */
export function Dialog({
  open,
  onClose,
  title,
  description,
  footer,
  busy = false,
  wide = false,
  onSubmit,
  children,
}: {
  open: boolean
  onClose: () => void
  title: ReactNode
  /** One line under the title; also the dialog's accessible description. */
  description?: ReactNode
  /** Buttons, right-aligned: the quiet "Anuluj" first, the main action last. */
  footer?: ReactNode
  busy?: boolean
  /** 44rem instead of 28rem, for forms with more fields. */
  wide?: boolean
  onSubmit?: (event: FormEvent<HTMLFormElement>) => void
  children: ReactNode
}) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = useId()
  const descriptionId = useId()

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) {
      dialog.showModal()
      dialog.querySelector<HTMLElement>('[data-autofocus]')?.focus()
    }
    if (!open && dialog.open) dialog.close()
  }, [open])

  const content = (
    <>
      <div className="blask-dialog__body">{children}</div>
      {footer != null && <footer className="blask-dialog__foot">{footer}</footer>}
    </>
  )

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      aria-describedby={description != null ? descriptionId : undefined}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      // Light dismiss where supported; Esc and the back gesture close it everywhere.
      {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
      className={`blask-dialog ${wide ? 'blask-dialog--wide' : ''}`}
    >
      <header className="blask-dialog__head">
        <div className="min-w-0">
          <h2 id={titleId} className="blask-dialog__title">
            {title}
          </h2>
          {description != null && (
            <p id={descriptionId} className="blask-dialog__lede">
              {description}
            </p>
          )}
        </div>
        <button
          type="button"
          className="blask-icon-btn"
          aria-label="Zamknij"
          disabled={busy}
          onClick={() => ref.current?.close()}
        >
          <CloseIcon className="size-5" />
        </button>
      </header>
      {onSubmit ? (
        <form noValidate onSubmit={onSubmit} className="contents">
          {content}
        </form>
      ) : (
        content
      )}
    </dialog>
  )
}
