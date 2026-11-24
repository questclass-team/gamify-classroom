import { useCallback, useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { fetchMyProfile } from '../api/student'
import { useApiData } from '../api/useApiData'
import { useAuth } from '../auth/authContext'
import { CheckIcon, ChevronIcon, CloseIcon, LogOutIcon, PenIcon } from '../components/blask/icons'
import { Wordmark } from '../components/blask/Wordmark'
import { NicknameDialog } from '../pages/student/NicknameDialog'
import { NO_NICKNAME } from '../pages/student/ranking'
import { StudentProfileContext, type StudentProfileValue } from './studentProfile'

const TOAST_MS = 6000

/**
 * Shell of the student area, all in Blask: a header with the wordmark, "Moje grupy" and the
 * account menu (nickname, "Ustaw nick"/"Zmień nick", "Wyloguj"), the page below it, and the
 * nickname dialog shared by the header and the pages. Rendered only below RequireRole.
 */
export function StudentLayout() {
  const { state, logout } = useAuth()
  const { state: profile } = useApiData(fetchMyProfile)
  const [savedNickname, setSavedNickname] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; key: number }>({ open: false, key: 0 })
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const returnFocus = useRef<HTMLElement | null>(null)
  const accountButton = useRef<HTMLButtonElement>(null)

  const nickname = savedNickname ?? (profile.status === 'ready' ? profile.data.nickname : undefined)

  const openNicknameDialog = useCallback((returnTo?: HTMLElement | null) => {
    returnFocus.current = returnTo ?? null
    setDialog((current) => ({ open: true, key: current.key + 1 }))
  }, [])

  const value = useMemo<StudentProfileValue>(
    () => ({ nickname, openNicknameDialog }),
    [nickname, openNicknameDialog],
  )

  useEffect(() => {
    if (toast === null) return
    const hide = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(hide)
  }, [toast])

  if (state.status !== 'authenticated') return null
  const { user } = state

  function closeDialog() {
    setDialog((current) => ({ ...current, open: false }))
    // The opener may be gone (a menu item, the ranking prompt): fall back to the account button.
    requestAnimationFrame(() => {
      const target = returnFocus.current
      if (target?.isConnected) target.focus()
      else accountButton.current?.focus()
    })
  }

  return (
    <StudentProfileContext.Provider value={value}>
      <div className="blask flex min-h-dvh flex-col bg-blask-paper">
        <a
          href="#student-main"
          className="blask-btn blask-btn-primary fixed top-3 left-3 z-[70] -translate-y-24 focus-visible:translate-y-0"
        >
          Przejdź do treści
        </a>
        <header className="blask-topbar sticky top-0 z-30">
          <div className="blask-content flex h-16 items-center gap-2 sm:gap-4">
            <Link
              to="/student"
              aria-label="QuestClass, moje grupy"
              className="flex-none rounded-md text-blask-ink no-underline"
            >
              <Wordmark />
            </Link>
            <nav aria-label="Strefa studenta" className="sm:ml-4">
              <NavLink to="/student" className="blask-navlink max-[23rem]:px-2.5">
                Moje grupy
              </NavLink>
            </nav>
            <AccountMenu
              buttonRef={accountButton}
              name={user.displayName}
              nickname={nickname}
              loading={profile.status === 'loading'}
              onNickname={() => openNicknameDialog(accountButton.current)}
              onLogout={() => void logout()}
            />
          </div>
        </header>

        <main id="student-main" tabIndex={-1} className="blask-content flex-1 pt-6 pb-16 sm:pt-8">
          <Outlet />
        </main>

        <NicknameDialog
          key={dialog.key}
          open={dialog.open}
          current={nickname ?? null}
          onSaved={(saved) => {
            setSavedNickname(saved)
            setToast({
              id: Date.now(),
              text: `Zapisano nick „${saved}”. Pod nim widzą Cię inni w rankingach.`,
            })
          }}
          onClose={closeDialog}
        />

        <div
          role="status"
          className="pointer-events-none fixed top-[4.75rem] right-4 left-4 z-40 flex justify-end sm:left-auto"
        >
          {toast !== null && (
            <div
              key={toast.id}
              className="blask-toast blask-pop pointer-events-auto flex max-w-sm items-start gap-3 py-3 pr-2 pl-4"
            >
              <CheckIcon className="mt-0.5 size-4 text-blask-cobalt" />
              <p className="text-[0.9375rem]">{toast.text}</p>
              <button
                type="button"
                className="grid size-7 flex-none cursor-pointer place-items-center rounded-full text-blask-graphite transition-colors hover:bg-blask-mist hover:text-blask-ink"
                aria-label="Zamknij powiadomienie"
                onClick={() => setToast(null)}
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </StudentProfileContext.Provider>
  )
}

/**
 * The name button and its small menu (a disclosure, not an ARIA menu): Esc, a click outside or
 * leaving it with Tab closes it; opening it puts the focus on the first action.
 */
function AccountMenu({
  buttonRef,
  name,
  nickname,
  loading,
  onNickname,
  onLogout,
}: {
  buttonRef: RefObject<HTMLButtonElement | null>
  name: string
  nickname: string | null | undefined
  loading: boolean
  onNickname: () => void
  onLogout: () => void
}) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const rootRef = useRef<HTMLDivElement>(null)
  const firstItem = useRef<HTMLButtonElement>(null)
  const label = nickname ?? name

  useEffect(() => {
    if (!open) return
    firstItem.current?.focus()
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpen(false)
      buttonRef.current?.focus()
    }
    const onPointer = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onFocus = (event: FocusEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    document.addEventListener('pointerdown', onPointer)
    document.addEventListener('focusin', onFocus)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('pointerdown', onPointer)
      document.removeEventListener('focusin', onFocus)
    }
  }, [open, buttonRef])

  return (
    <div ref={rootRef} className="relative ml-auto">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((current) => !current)}
        className="flex min-h-10 cursor-pointer items-center gap-2 rounded-full py-1 pr-2.5 pl-1 text-[0.9375rem] font-medium text-blask-ink transition-colors hover:bg-blask-mist aria-expanded:bg-blask-mist"
      >
        <span
          aria-hidden="true"
          className="grid size-8 flex-none place-items-center rounded-full bg-blask-mist text-[0.8125rem] font-bold text-blask-cobalt-deep shadow-[inset_0_0_0_1.5px_#8e9bff]"
        >
          {label.trim()[0]?.toLocaleUpperCase('pl') ?? '?'}
        </span>
        <span className="max-w-[11rem] truncate max-sm:sr-only">
          <span className="sr-only">Konto: </span>
          {label}
        </span>
        <ChevronIcon className="size-4 text-blask-graphite" />
      </button>
      {open && (
        <div id={id} className="blask-menu blask-pop">
          <div className="px-3 pt-2 pb-3 text-sm">
            <p className="font-semibold">{name}</p>
            <p className="mt-0.5 text-blask-graphite">
              {nickname === undefined
                ? loading
                  ? 'Sprawdzanie nicku…'
                  : 'Nie udało się sprawdzić nicku. Możesz ustawić go mimo to.'
                : nickname === null
                  ? `Nie masz jeszcze nicku. W rankingach widać Cię jako „${NO_NICKNAME}”.`
                  : `Nick w rankingach: ${nickname}`}
            </p>
          </div>
          <ul className="flex flex-col gap-0.5 border-t border-[var(--blask-divider)] pt-1.5">
            <li>
              <button
                ref={firstItem}
                type="button"
                className="blask-menu-item"
                onClick={() => {
                  setOpen(false)
                  onNickname()
                }}
              >
                <PenIcon className="size-4 text-blask-graphite" />
                {nickname ? 'Zmień nick' : 'Ustaw nick'}
              </button>
            </li>
            <li>
              <button type="button" className="blask-menu-item" onClick={onLogout}>
                <LogOutIcon className="size-4 text-blask-graphite" />
                Wyloguj
              </button>
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}
