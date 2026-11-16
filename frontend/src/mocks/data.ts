import type { CurrentUser } from '../api/types'

export interface MockGroup {
  id: string
  name: string
  teacherId: string
  studentIds: string[]
  createdAt: string
}

/** Fake LDAP password accepted for every mock account. */
export const MOCK_PASSWORD = 'haslo'

/** Imported accounts (core database). */
export const mockUsers: CurrentUser[] = [
  { id: 'u-admin', login: 'admin', displayName: 'Anna Administratorka', role: 'admin' },
  { id: 'u-teacher', login: 'nauczyciel', displayName: 'Jan Kowalski', role: 'teacher' },
  { id: 'u-teacher2', login: 'mwisniewski', displayName: 'Marek Wiśniewski', role: 'teacher' },
  { id: 'u-student', login: 'student', displayName: 'Ewa Nowak', role: 'student' },
  { id: 'u-student2', login: 'pzielinski', displayName: 'Piotr Zieliński', role: 'student' },
  { id: 'u-student3', login: 'kwojcik', displayName: 'Katarzyna Wójcik', role: 'student' },
]

/** Valid in LDAP but never imported: login must be rejected with 403. */
export const mockLdapOnlyLogins = ['nowy']

/** Groups of `nauczyciel` plus one of another teacher, which `nauczyciel` must never see. */
export const mockGroups: MockGroup[] = [
  {
    id: 'g-1',
    name: 'Inżynieria oprogramowania – grupa 1',
    teacherId: 'u-teacher',
    studentIds: ['u-student', 'u-student2'],
    createdAt: '2026-10-06T08:00:00Z',
  },
  {
    id: 'g-2',
    name: 'Programowanie obiektowe – lab 3',
    teacherId: 'u-teacher',
    studentIds: ['u-student3'],
    createdAt: '2026-10-08T10:30:00Z',
  },
  {
    id: 'g-3',
    name: 'Bazy danych – grupa 2',
    teacherId: 'u-teacher2',
    studentIds: ['u-student'],
    createdAt: '2026-10-07T12:00:00Z',
  },
]
