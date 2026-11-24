import type { Badge, CurrentUser, GroupGameConfig } from '../api/types'

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

/**
 * Student nicknames (Core `User.Nickname`): unique ignoring letter case, null until set. `student`
 * starts without one, so the ranking prompt and the nickname dialog can be tried at once.
 */
export const mockNicknames = new Map<string, string | null>([
  ['u-student', null],
  ['u-student2', 'Cichy Lis'],
  ['u-student3', 'Nocna Sowa'],
  ['u-student4', 'Kwantowy Kot'],
  ['u-student5', null],
  ['u-student6', 'Zielony Smok'],
  ['u-student7', 'Bystry Bóbr'],
  ['u-student8', 'Mała Mi'],
])

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
      { studentId: 'u-student3', addedAt: '2026-10-06T08:07:00Z' },
      { studentId: 'u-student4', addedAt: '2026-10-06T08:08:00Z' },
      { studentId: 'u-student5', addedAt: '2026-10-06T08:09:00Z' },
      { studentId: 'u-student6', addedAt: '2026-10-06T08:10:00Z' },
      { studentId: 'u-student8', addedAt: '2026-10-13T09:30:00Z' },
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
    members: [
      { studentId: 'u-student', addedAt: '2026-10-07T12:10:00Z' },
      { studentId: 'u-student5', addedAt: '2026-10-07T12:11:00Z' },
      { studentId: 'u-student7', addedAt: '2026-10-07T12:12:00Z' },
    ],
    createdAt: '2026-10-07T12:00:00Z',
  },
]

/** A teacher's own pixel-art icon (custom upload demo), drawn in the Blask palette: nothing yellow. */
const COIN_SVG =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 8 8" shape-rendering="crispEdges"><path fill="#1d29d6" d="M2 0h4v1h1v1h1v4h-1v1h-1v1h-4v-1h-1v-1h-1v-4h1v-1h1z"/><path fill="#8e9bff" d="M2 1h4v1h1v4h-1v1h-4v-1h-1v-4h1z"/><path fill="#fbfaff" d="M2 2h1v2h-1z"/><path fill="#6c3bf4" d="M4 2h1v4h-1z"/></svg>'

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

/** Point reward in the game service; the balance is the sum of a student's rewards per group. */
export interface MockReward {
  id: number
  groupId: string
  studentId: string
  points: number
  reason: string
  awardedBy: string
  createdAt: string
}

export interface MockBadgeAward {
  id: number
  groupId: string
  badgeId: number
  studentId: string
  awardedBy: string
  createdAt: string
  /** Revoked awards stay stored, like in the game service, but are never listed. */
  revokedAt: string | null
}

function reward(
  id: number,
  studentId: string,
  points: number,
  reason: string,
  createdAt: string,
): MockReward {
  return { id, groupId: 'g-1', studentId, points, reason, awardedBy: 'u-teacher', createdAt }
}

/** Rewards from the last weeks of the semester: mostly g-1, a few in g-3 (another teacher). */
export const mockRewards: MockReward[] = [
  reward(1, 'u-student', 40, 'Aktywność na zajęciach', '2026-10-13T09:40:00Z'),
  reward(2, 'u-student2', 30, 'Aktywność na zajęciach', '2026-10-13T09:41:00Z'),
  reward(3, 'u-student4', 70, 'Najlepsza analiza wymagań w grupie', '2026-10-13T09:45:00Z'),
  reward(4, 'u-student', 60, 'Laboratorium 3: diagram przypadków użycia', '2026-10-27T10:05:00Z'),
  reward(5, 'u-student2', 80, 'Laboratorium 3: diagram przypadków użycia', '2026-10-27T10:06:00Z'),
  reward(6, 'u-student3', 50, 'Laboratorium 3: diagram przypadków użycia', '2026-10-27T10:07:00Z'),
  reward(7, 'u-student4', 45, 'Laboratorium 3: diagram przypadków użycia', '2026-10-27T10:08:00Z'),
  reward(8, 'u-student2', 120, 'Projekt, etap 1: specyfikacja', '2026-11-10T11:20:00Z'),
  reward(9, 'u-student6', 100, 'Projekt, etap 1: specyfikacja', '2026-11-10T11:21:00Z'),
  reward(10, 'u-student8', 15, 'Poprawka laboratorium 3', '2026-11-12T08:15:00Z'),
  reward(11, 'u-student', 25, 'Prezentacja przeglądu sprintu', '2026-11-17T12:30:00Z'),
  reward(12, 'u-student6', 180, 'Najlepsza prezentacja przeglądu sprintu', '2026-11-17T12:31:00Z'),
  reward(13, 'u-student2', 90, 'Przegląd kodu dla innej drużyny', '2026-11-19T14:10:00Z'),
  ...[
    { id: 14, studentId: 'u-student7', points: 12, reason: 'Kolokwium z SQL', at: '2026-11-04' },
    { id: 15, studentId: 'u-student', points: 8, reason: 'Zapytania z JOIN', at: '2026-11-04' },
    {
      id: 16,
      studentId: 'u-student',
      points: 5,
      reason: 'Aktywność na zajęciach',
      at: '2026-11-18',
    },
  ].map(({ id, studentId, points, reason, at }) => ({
    id,
    groupId: 'g-3',
    studentId,
    points,
    reason,
    awardedBy: 'u-teacher2',
    createdAt: `${at}T13:20:00Z`,
  })),
]

/** Badge catalog of the game service (all groups). */
export const mockBadges: Badge[] = [
  {
    id: 1,
    groupId: 'g-1',
    name: 'Pomocna dłoń',
    description: 'Za pomoc innym w czasie zajęć',
    icon: 'star',
    createdAt: '2026-10-13T09:00:00Z',
  },
  {
    id: 2,
    groupId: 'g-1',
    name: 'Czysty przegląd',
    description: 'Za kod przyjęty w przeglądzie bez żadnych poprawek',
    icon: 'medal',
    createdAt: '2026-10-20T10:00:00Z',
  },
  {
    id: 3,
    groupId: 'g-1',
    name: 'Mistrz testów',
    description: 'Za projekt pokryty testami w ponad 80%',
    icon: 'trophy',
    createdAt: '2026-11-03T10:00:00Z',
  },
]

function badgeAward(
  id: number,
  badgeId: number,
  studentId: string,
  createdAt: string,
  revokedAt: string | null = null,
): MockBadgeAward {
  return { id, groupId: 'g-1', badgeId, studentId, awardedBy: 'u-teacher', createdAt, revokedAt }
}

export const mockBadgeAwards: MockBadgeAward[] = [
  badgeAward(1, 1, 'u-student', '2026-10-20T10:30:00Z'),
  badgeAward(2, 2, 'u-student2', '2026-10-21T08:10:00Z'),
  // Given by mistake and revoked a minute later: stored, never listed.
  badgeAward(3, 2, 'u-student8', '2026-10-21T08:11:00Z', '2026-10-21T08:12:00Z'),
  badgeAward(4, 1, 'u-student6', '2026-11-05T09:00:00Z'),
  badgeAward(5, 3, 'u-student2', '2026-11-12T13:00:00Z'),
]
