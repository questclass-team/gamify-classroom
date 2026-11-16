import { Navigate, Outlet, useLocation } from 'react-router'
import type { Role } from '../api/types'
import { FullPageMessage } from '../components/FullPageMessage'
import { useAuth } from './authContext'
import { ROLE_HOME } from './roles'

/** Lets through only authenticated users with the given role. */
export function RequireRole({ role }: { role: Role }) {
  const { state } = useAuth()
  const location = useLocation()

  if (state.status === 'loading') return <FullPageMessage>Ładowanie…</FullPageMessage>
  if (state.status === 'anonymous') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />
  }
  if (state.user.role !== role) return <Navigate to={ROLE_HOME[state.user.role]} replace />
  return <Outlet />
}

/** `/` sends users to their role's home page or to the login screen. */
export function RootRedirect() {
  const { state } = useAuth()

  if (state.status === 'loading') return <FullPageMessage>Ładowanie…</FullPageMessage>
  if (state.status === 'anonymous') return <Navigate to="/login" replace />
  return <Navigate to={ROLE_HOME[state.user.role]} replace />
}
