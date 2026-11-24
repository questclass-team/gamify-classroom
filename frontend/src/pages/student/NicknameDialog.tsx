import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import { saveMyProfile } from '../../api/student'
import { NICKNAME_MAX_LENGTH } from '../../api/types'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { SpinnerIcon } from '../../components/blask/icons'
import { NICKNAME_RULES, nicknameError, nicknameSaveError, normalizeNickname } from './nickname'

interface NicknameDialogProps {
  open: boolean
  /** The nickname now, null when none is set. */
  current: string | null
  onSaved: (nickname: string) => void
  /** Called when the dialog closes for any reason (saved, Anuluj, Esc, a click outside). */
  onClose: () => void
}

/**
 * Sets or changes the student's nickname (PUT /api/core/me/profile), on the native modal dialog:
 * the field gets the focus, the rules are checked before sending and the server's answers (taken,
 * invalid) come back in Polish next to the field. Remount it (`key`) for each opening so it
 * starts from the current nickname. Render it inside a `.blask` element.
 */
export function NicknameDialog({ open, current, onSaved, onClose }: NicknameDialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const id = useId()
  const [value, setValue] = useState(current ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const dialog = ref.current
    if (dialog === null) return
    if (open && !dialog.open) dialog.showModal()
    if (!open && dialog.open) dialog.close()
  }, [open])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problem = nicknameError(value)
    if (problem !== null) {
      setError(problem)
      inputRef.current?.focus()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await saveMyProfile({ nickname: normalizeNickname(value) })
      onSaved(saved.nickname ?? normalizeNickname(value))
      ref.current?.close()
    } catch (failure) {
      setError(nicknameSaveError(failure))
      inputRef.current?.focus()
    } finally {
      setBusy(false)
    }
  }

  const length = normalizeNickname(value).length
  const title = current === null ? 'Ustaw nick' : 'Zmień nick'

  return (
    <dialog
      ref={ref}
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-intro`}
      onClose={onClose}
      onCancel={(event) => {
        if (busy) event.preventDefault()
      }}
      {...({ closedby: busy ? 'none' : 'any' } as Record<string, string>)}
      className="blask-dialog"
    >
      <form noValidate onSubmit={submit} className="flex flex-col gap-4 p-6">
        <h2 id={`${id}-title`} className="text-xl leading-tight font-semibold tracking-[-0.01em]">
          {title}
        </h2>
        <p id={`${id}-intro`} className="text-[0.9375rem] text-blask-graphite">
          W rankingach grup widać tylko nicki, nigdy imiona ani loginy. Nick musi być unikalny w
          całym QuestClass i możesz go później zmienić.
        </p>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-baseline justify-between gap-3">
            <label htmlFor={`${id}-input`} className="font-semibold">
              Nick
            </label>
            <span
              aria-hidden="true"
              className={`blask-num text-[0.8125rem] ${length > NICKNAME_MAX_LENGTH ? 'font-semibold text-blask-raspberry' : 'text-blask-graphite'}`}
            >
              {length}/{NICKNAME_MAX_LENGTH}
            </span>
          </div>
          <input
            ref={inputRef}
            id={`${id}-input`}
            className="blask-input"
            value={value}
            autoFocus
            autoComplete="off"
            spellCheck={false}
            aria-invalid={error !== null}
            aria-describedby={`${id}-hint${error !== null ? ` ${id}-error` : ''}`}
            onChange={(event) => {
              setValue(event.target.value)
              // Once a message is shown it follows the typing, so it clears as soon as it is fixed.
              if (error !== null) setError(nicknameError(event.target.value))
            }}
          />
          <p id={`${id}-hint`} className="text-[0.8125rem] text-blask-graphite">
            {NICKNAME_RULES}
          </p>
          {error !== null && (
            <div id={`${id}-error`}>
              <BlaskNotice tone="error">{error}</BlaskNotice>
            </div>
          )}
        </div>

        <div className="flex flex-wrap justify-end gap-2">
          <button
            type="button"
            className="blask-btn blask-btn-quiet"
            disabled={busy}
            onClick={() => ref.current?.close()}
          >
            Anuluj
          </button>
          <button
            type="submit"
            className="blask-btn blask-btn-primary"
            data-busy={busy}
            aria-disabled={busy || undefined}
          >
            {busy && <SpinnerIcon />}
            {busy ? 'Zapisywanie…' : 'Zapisz nick'}
          </button>
        </div>
      </form>
    </dialog>
  )
}
