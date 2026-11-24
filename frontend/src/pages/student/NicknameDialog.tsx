import { useId, useState, type FormEvent } from 'react'
import { saveMyProfile } from '../../api/student'
import { NICKNAME_MAX_LENGTH } from '../../api/types'
import { Button } from '../../components/blask/Button'
import { Dialog } from '../../components/blask/Dialog'
import { TextField } from '../../components/blask/Field'
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
 * Sets or changes the student's nickname (PUT /api/core/me/profile) on the kit's Dialog: the field
 * gets the focus, the rules are checked before sending and the server's answers (taken, invalid)
 * come back in Polish under the field. Remount it (`key`) for each opening so it starts from the
 * current nickname. The app shell renders it for the header and the pages.
 */
export function NicknameDialog({ open, current, onSaved, onClose }: NicknameDialogProps) {
  const inputId = useId()
  const [value, setValue] = useState(current ?? '')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  function focusField() {
    document.getElementById(inputId)?.focus()
  }

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    const problem = nicknameError(value)
    if (problem !== null) {
      setError(problem)
      focusField()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await saveMyProfile({ nickname: normalizeNickname(value) })
      onSaved(saved.nickname ?? normalizeNickname(value))
      onClose()
    } catch (failure) {
      setError(nicknameSaveError(failure))
      focusField()
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      title={current === null ? 'Ustaw nick' : 'Zmień nick'}
      description="W rankingach grup widać tylko nicki, nigdy imiona ani loginy. Nick musi być unikalny w całym QuestClass i możesz go później zmienić."
      onSubmit={submit}
      footer={
        <>
          <Button variant="quiet" disabled={busy} onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Zapisywanie…">
            Zapisz nick
          </Button>
        </>
      }
    >
      <TextField
        id={inputId}
        label="Nick"
        value={value}
        data-autofocus
        autoComplete="off"
        spellCheck={false}
        hint={NICKNAME_RULES}
        error={error}
        counter={{ length: normalizeNickname(value).length, max: NICKNAME_MAX_LENGTH }}
        onChange={(event) => {
          setValue(event.target.value)
          // Once a message is shown it follows the typing, so it clears as soon as it is fixed.
          if (error !== null) setError(nicknameError(event.target.value))
        }}
      />
    </Dialog>
  )
}
