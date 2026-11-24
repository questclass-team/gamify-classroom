import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { fetchMyProfile } from '../api/student'
import type { CurrentUser, Role } from '../api/types'
import { useApiData } from '../api/useApiData'
import { useAuth } from '../auth/authContext'
import { ROLE_HOME, ROLE_LABEL } from '../auth/roles'
import { CheckIcon, CloseIcon, LogOutIcon, PenIcon } from '../components/blask/icons'
import { ThemeSwitch } from '../components/blask/ThemeSwitch'
import { Wordmark } from '../components/blask/Wordmark'
import { NicknameDialog } from '../pages/student/NicknameDialog'
import { NO_NICKNAME } from '../pages/student/ranking'
import { AccountMenu } from './AccountMenu'
import { ShellContext, useShell, type ShellValue } from './shellContext'
import { StudentProfileContext, type StudentProfileValue } from './studentProfile'

/** The app links of each role; a link stays lit on the pages below it. */
const NAV: Record<Role, { to: string; label: string }[]> = {
  admin: [{ to: '/admin', label: 'Import kont' }],
  teacher: [{ to: '/teacher', label: 'Moje grupy' }],
  student: [{ to: '/student', label: 'Moje grupy' }],
}

const TOAST_MS = 6000
const MAIN_ID = 'main'

/**
 * The Blask app shell of every signed-in page (all roles), rendered below RequireRole: a skip
 * link, the sticky header (wordmark, the role's links with the glint under the current one, the
 * theme switch, the page's aside, the account menu, Wyloguj; on phones the links get their own
 * row) and `<main>` with the page in the content frame. Students also get their profile
 * (nickname) and the nickname dialog, shared with the pages through useStudentProfile().
 */
export function AppShell() {
  const { state } = useAuth()
  if (state.status !== 'authenticated') return null
  const { user } = state
  return user.role === 'student' ? (
    <StudentShell user={user} />
  ) : (
    <ShellFrame
      user={user}
      account={
        <AccountMenu label={user.displayName}>
          {() => <AccountSummary user={user} detail={`Login: ${user.login}`} />}
        </AccountMenu>
      }
    />
  )
}

function AccountSummary({ user, detail }: { user: CurrentUser; detail: ReactNode }) {
  return (
    <div className="px-3 pt-2 pb-3 text-sm">
      <p className="font-semibold">{user.displayName}</p>
      <p className="text-blask-graphite">{ROLE_LABEL[user.role]}</p>
      <p className="mt-1.5 text-blask-graphite">{detail}</p>
    </div>
  )
}

/** The frame itself: header, main, toasts. `children` are extras (the nickname dialog). */
function ShellFrame({
  user,
  account,
  children,
}: {
  user: CurrentUser
  account: ReactNode
  children?: ReactNode
}) {
  const { logout } = useAuth()
  const [toast, setToast] = useState<{ id: number; text: string } | null>(null)
  const [asideSlot, setAsideSlot] = useState<HTMLElement | null>(null)
  const [subnavSlot, setSubnavSlot] = useState<HTMLElement | null>(null)
  const headerRef = useRef<HTMLElement>(null)

  const notify = useCallback((text: string) => setToast({ id: Date.now(), text }), [])
  const value = useMemo<ShellValue>(
    () => ({ notify, asideSlot, subnavSlot }),
    [notify, asideSlot, subnavSlot],
  )

  useEffect(() => {
    if (toast === null) return
    const hide = window.setTimeout(() => setToast(null), TOAST_MS)
    return () => window.clearTimeout(hide)
  }, [toast])

  // The sticky header's height, for what sticks under it and for scroll offsets.
  useLayoutEffect(() => {
    const header = headerRef.current
    if (header === null) return
    const root = document.documentElement
    const measure = () => root.style.setProperty('--blask-head-h', `${header.offsetHeight}px`)
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(header)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--blask-head-h')
    }
  }, [])

  const links = (
    <ul className="flex items-center gap-1">
      {NAV[user.role].map((item) => (
        <li key={item.to} className="flex-none">
          <NavLink to={item.to} className="blask-navlink">
            {item.label}
          </NavLink>
        </li>
      ))}
    </ul>
  )

  return (
    <ShellContext.Provider value={value}>
      <div className="flex min-h-dvh flex-col">
        <a href={`#${MAIN_ID}`} className="blask-skip blask-btn blask-btn-primary">
          Przejdź do treści
        </a>
        <header ref={headerRef} className="blask-topbar sticky top-0 z-30">
          <div className="blask-content flex h-16 items-center gap-3 sm:gap-4">
            <Link
              to={ROLE_HOME[user.role]}
              aria-label="QuestClass, strona główna"
              className="flex-none rounded-md text-blask-ink no-underline max-sm:-my-1.5 max-sm:py-1.5"
            >
              <Wordmark />
            </Link>
            <nav aria-label="Aplikacja" className="ml-4 hidden md:block">
              {links}
            </nav>
            <div className="ml-auto flex items-center gap-1 sm:gap-2">
              <ThemeSwitch className="mr-1 sm:mr-2" />
              <div ref={setAsideSlot} className="contents" />
              {account}
              <button
                type="button"
                onClick={() => void logout()}
                className="blask-btn blask-btn-sm blask-btn-quiet max-sm:px-2.5"
              >
                <LogOutIcon className="size-3.5" />
                <span className="max-sm:sr-only">Wyloguj</span>
              </button>
            </div>
          </div>
          <nav
            aria-label="Aplikacja"
            className="border-t border-(--blask-panel-border) [--blask-glint-drop:8px] md:hidden"
          >
            <div className="blask-content py-2 max-sm:px-3">{links}</div>
          </nav>
          <div ref={setSubnavSlot} />
        </header>

        <main
          id={MAIN_ID}
          tabIndex={-1}
          className="blask-content flex flex-1 flex-col gap-8 pt-6 pb-16 focus-visible:outline-none sm:pt-8"
        >
          <Outlet />
        </main>

        {children}

        {/* At the bottom edge, away from the header and the page's actions (.blask-toast-dock). */}
        <div role="status" className="blask-toast-dock">
          {toast !== null && (
            <div
              key={toast.id}
              className="blask-toast blask-pop pointer-events-auto flex max-w-sm items-start gap-3 py-3 pr-2 pl-4"
            >
              <CheckIcon className="mt-0.5 size-4 text-blask-cobalt" />
              <p className="text-[0.9375rem]">{toast.text}</p>
              <button
                type="button"
                className="blask-icon-btn -my-1 size-8 max-sm:-my-2 max-sm:size-11"
                aria-label="Zamknij powiadomienie"
                onClick={() => setToast(null)}
              >
                <CloseIcon />
              </button>
            </div>
          )}
        </div>
      </div>
    </ShellContext.Provider>
  )
}

/** The student's shell: the profile (nickname), the account menu with it and the dialog. */
function StudentShell({ user }: { user: CurrentUser }) {
  const { state: profile } = useApiData(fetchMyProfile)
  const [savedNickname, setSavedNickname] = useState<string | null>(null)
  const [dialog, setDialog] = useState<{ open: boolean; key: number }>({ open: false, key: 0 })
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
      <ShellFrame
        user={user}
        account={
          <AccountMenu buttonRef={accountButton} label={nickname ?? user.displayName}>
            {(close) => (
              <>
                <AccountSummary
                  user={user}
                  detail={
                    nickname === undefined
                      ? profile.status === 'loading'
                        ? 'Sprawdzanie nicku…'
                        : 'Nie udało się sprawdzić nicku. Możesz ustawić go mimo to.'
                      : nickname === null
                        ? `Nie masz jeszcze nicku. W rankingach widać Cię jako „${NO_NICKNAME}”.`
                        : `Nick w rankingach: ${nickname}`
                  }
                />
                <div className="border-t border-(--blask-divider) pt-1.5">
                  <button
                    type="button"
                    className="blask-menu-item"
                    onClick={() => {
                      close()
                      openNicknameDialog(accountButton.current)
                    }}
                  >
                    <PenIcon className="size-4 text-blask-graphite" />
                    {nickname ? 'Zmień nick' : 'Ustaw nick'}
                  </button>
                </div>
              </>
            )}
          </AccountMenu>
        }
      >
        <StudentNicknameDialog
          dialogKey={dialog.key}
          open={dialog.open}
          nickname={nickname ?? null}
          onSaved={setSavedNickname}
          onClose={closeDialog}
        />
      </ShellFrame>
    </StudentProfileContext.Provider>
  )
}

/** The nickname dialog inside the frame, so a saved nickname is confirmed by the shell's toast. */
function StudentNicknameDialog({
  dialogKey,
  open,
  nickname,
  onSaved,
  onClose,
}: {
  dialogKey: number
  open: boolean
  nickname: string | null
  onSaved: (nickname: string) => void
  onClose: () => void
}) {
  const { notify } = useShell()
  return (
    <NicknameDialog
      key={dialogKey}
      open={open}
      current={nickname}
      onSaved={(saved) => {
        onSaved(saved)
        notify(`Zapisano nick „${saved}”. Pod nim widzą Cię inni w rankingach.`)
      }}
      onClose={onClose}
    />
  )
}
