import type { Role } from '../api/types'

/** Landing page for each role after login. */
export const ROLE_HOME: Record<Role, string> = {
  admin: '/admin',
  teacher: '/teacher',
  student: '/student',
}

export const ROLE_LABEL: Record<Role, string> = {
  admin: 'Administrator',
  teacher: 'Prowadzący',
  student: 'Student',
}
