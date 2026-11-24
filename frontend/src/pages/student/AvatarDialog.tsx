import { useEffect, useRef, useState, type FormEvent } from 'react'
import { saveAvatar } from '../../api/student'
import type { AvatarKey } from '../../api/types'
import { AvatarPicker } from '../../components/blask/AvatarPicker'
import { BlaskNotice } from '../../components/blask/BlaskNotice'
import { Button } from '../../components/blask/Button'
import { Dialog } from '../../components/blask/Dialog'
import { avatarSaveError } from './avatar'

interface AvatarDialogProps {
  open: boolean
  /** The avatar now, null when none is chosen. */
  current: AvatarKey | null
  onSaved: (avatar: AvatarKey | null) => void
  /** Called when the dialog closes for any reason (saved, Anuluj, Esc, a click outside). */
  onClose: () => void
}

/**
 * Chooses, changes or removes ("Bez awatara") the student's avatar (PUT /api/core/me/avatar) on
 * the kit's Dialog. The focus starts on the current choice; the arrow keys move it. A failed save
 * keeps the dialog open with the reason above the picker, scrolled into view. Remount it (`key`)
 * for each opening so it starts from the current avatar. The app shell renders it for the header
 * and the pages.
 */
export function AvatarDialog({ open, current, onSaved, onClose }: AvatarDialogProps) {
  const [value, setValue] = useState<AvatarKey | null>(current)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const noticeRef = useRef<HTMLDivElement>(null)

  // On a phone the picker scrolls inside the dialog: bring the reason up where it can be read.
  useEffect(() => {
    if (error !== null) noticeRef.current?.scrollIntoView({ block: 'nearest' })
  }, [error])

  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy) return
    if (value === current) {
      onClose()
      return
    }
    setBusy(true)
    setError(null)
    try {
      const saved = await saveAvatar(value)
      onSaved(saved.avatar)
      onClose()
    } catch (failure) {
      setError(avatarSaveError(failure))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      busy={busy}
      wide
      title={current === null ? 'Wybierz awatar' : 'Zmień awatar'}
      description="Awatar stoi obok Twojego nicku w rankingach grup. To zwierzę albo znak z nieba, nigdy zdjęcie ani litery, więc inni nadal nie wiedzą, kim jesteś."
      onSubmit={submit}
      footer={
        <>
          <Button variant="quiet" disabled={busy} onClick={onClose}>
            Anuluj
          </Button>
          <Button type="submit" variant="primary" busy={busy} busyLabel="Zapisywanie…">
            Zapisz awatar
          </Button>
        </>
      }
    >
      {error !== null && (
        <div ref={noticeRef} className="mb-4">
          <BlaskNotice tone="error" title="Nie udało się zapisać awatara.">
            <p className="text-sm">{error}</p>
          </BlaskNotice>
        </div>
      )}
      <AvatarPicker value={value} onChange={setValue} />
    </Dialog>
  )
}
