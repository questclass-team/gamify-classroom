import { Outlet } from 'react-router'
import { useAuth } from '../auth/authContext'
import { ROLE_LABEL } from '../auth/roles'
import { Logo } from '../components/Logo'
import { Button } from '../components/ui'

/** Shell for signed-in pages; rendered only below RequireRole. */
export function AppLayout() {
  const { state, logout } = useAuth()
  if (state.status !== 'authenticated') return null
  const { user } = state

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b-2 border-accent bg-header text-on-header">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
          <Logo compact />
          <div className="flex min-w-0 items-center gap-3 text-sm sm:gap-4">
            <span className="flex min-w-0 flex-col items-end leading-tight">
              <span className="max-w-full truncate font-medium">{user.displayName}</span>
              <span className="text-xs text-on-header/65">{ROLE_LABEL[user.role]}</span>
            </span>
            <Button variant="ghost" onClick={logout}>
              Wyloguj
            </Button>
          </div>
        </div>
      </header>
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-8 px-4 py-6 sm:px-6 sm:py-8">
        <Outlet />
      </main>
    </div>
  )
}
