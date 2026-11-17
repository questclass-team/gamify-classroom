import type { CurrentUser, GroupGameConfig } from '../api/types'

export interface MockGroup {
  id: string
  name: string
  teacherId: string
  members: { studentId: string; addedAt: string }[]
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
  {
    id: 'u-student4',
    login: 'alewandowska',
    displayName: 'Aleksandra Lewandowska',
    role: 'student',
  },
  { id: 'u-student5', login: 'tkaminski', displayName: 'Tomasz Kamiński', role: 'student' },
  { id: 'u-student6', login: 'zdabrowska', displayName: 'Zofia Dąbrowska', role: 'student' },
  { id: 'u-student7', login: 'mszymanski', displayName: 'Michał Szymański', role: 'student' },
  { id: 'u-student8', login: 'jwozniak', displayName: 'Julia Woźniak', role: 'student' },
]

/** Valid in LDAP but never imported: login must be rejected with 403. */
export const mockLdapOnlyLogins = ['nowy']

/** Groups of `nauczyciel` plus one of another teacher, which `nauczyciel` must never see. */
export const mockGroups: MockGroup[] = [
  {
    id: 'g-1',
    name: 'Inżynieria oprogramowania – grupa 1',
    teacherId: 'u-teacher',
    members: [
      { studentId: 'u-student', addedAt: '2026-10-06T08:05:00Z' },
      { studentId: 'u-student2', addedAt: '2026-10-06T08:06:00Z' },
    ],
    createdAt: '2026-10-06T08:00:00Z',
  },
  {
    id: 'g-2',
    name: 'Programowanie obiektowe – lab 3',
    teacherId: 'u-teacher',
    members: [{ studentId: 'u-student3', addedAt: '2026-10-08T10:35:00Z' }],
    createdAt: '2026-10-08T10:30:00Z',
  },
  {
    id: 'g-3',
    name: 'Bazy danych – grupa 2',
    teacherId: 'u-teacher2',
    members: [{ studentId: 'u-student', addedAt: '2026-10-07T12:10:00Z' }],
    createdAt: '2026-10-07T12:00:00Z',
  },
]

const COIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="#7a5410" d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z"/><path fill="#e3b341" d="M2 1h4v1h1v4h-1v1h-4v-1h-1v-4h1z"/><path fill="#fff1b8" d="M2 2h1v2h-1z"/><path fill="#b8862b" d="M4 2h1v4h-1z"/></svg>'

/** Game service data per group id: only g-1 was configured, other groups get the defaults. */
export const mockGameConfigs = new Map<string, GroupGameConfig>([
  [
    'g-1',
    {
      currencyName: 'Złote monety',
      currencyIconUrl: `data:image/svg+xml,${encodeURIComponent(COIN_SVG)}`,
      ranks: [
        { name: 'Nowicjusz', threshold: 0 },
        { name: 'Giermek', threshold: 100 },
        { name: 'Rycerz', threshold: 300 },
      ],
    },
  ],
])

export const DEFAULT_GAME_CONFIG: GroupGameConfig = {
  currencyName: 'Punkty',
  currencyIconUrl: null,
  ranks: [],
}
