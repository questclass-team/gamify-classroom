import { delay, http, HttpResponse } from 'msw'
import {
  CURRENCY_ICON_MAX_BYTES,
  CURRENCY_ICON_TYPES,
  GROUP_NAME_MAX_LENGTH,
  RANK_THRESHOLD_MAX,
  STUDENT_SEARCH_MIN_LENGTH,
  USER_IMPORT_CSV_HEADER,
  type AddGroupStudentRequest,
  type CreateGroupRequest,
  type CurrencyIconResponse,
  type CurrentUser,
  type GroupDetail,
  type GroupGameConfig,
  type GroupStudent,
  type GroupSummary,
  type LoginRequest,
  type LoginResponse,
  type ProblemDetails,
  type Role,
  type StudentSummary,
  type UpdateGameConfigRequest,
  type UserImportReport,
} from '../api/types'
import {
  DEFAULT_GAME_CONFIG,
  MOCK_PASSWORD,
  mockGameConfigs,
  mockGroups,
  mockLdapOnlyLogins,
  mockUsers,
  type MockGroup,
} from './data'
import { createMockToken, readMockBearer } from './jwt'
import { importUsersFromCsv } from './userImport'

const TOKEN_TTL_SECONDS = 60 * 60

function problem(status: number, title: string, detail: string) {
  return HttpResponse.json<ProblemDetails>(
    { title, status, detail },
    { status, headers: { 'Content-Type': 'application/problem+json' } },
  )
}

/** Resolves the caller from the Bearer header; returns an error response if not allowed. */
function authorize(request: Request, role?: Role): CurrentUser | Response {
  const userId = readMockBearer(request.headers.get('Authorization'))
  const user = mockUsers.find((candidate) => candidate.id === userId)
  if (user === undefined) return problem(401, 'Unauthorized', 'Missing or expired token.')
  if (role !== undefined && user.role !== role) {
    return problem(403, 'Forbidden', `Requires role ${role}.`)
  }
  return user
}

export const handlers = [
  http.post('/api/core/auth/login', async ({ request }) => {
    await delay(300)
    const { login, password } = (await request.json()) as LoginRequest
    const normalized = login.trim().toLowerCase()
    const knownToLdap =
      mockUsers.some((user) => user.login === normalized) || mockLdapOnlyLogins.includes(normalized)

    if (!knownToLdap || password !== MOCK_PASSWORD) {
      return problem(401, 'Unauthorized', 'Invalid LDAP credentials.')
    }
    const user = mockUsers.find((candidate) => candidate.login === normalized)
    if (user === undefined) {
      return problem(403, 'Forbidden', 'Account has not been imported.')
    }
    return HttpResponse.json({
      accessToken: createMockToken(user.id, TOKEN_TTL_SECONDS),
      user,
    } satisfies LoginResponse)
  }),

  http.get('/api/core/auth/me', ({ request }) => {
    const user = authorize(request)
    return user instanceof Response ? user : HttpResponse.json(user)
  }),

  // Mock accounts live in memory: imported users can log in until the page reloads.
  http.post('/api/core/admin/users/import', async ({ request }) => {
    await delay(500)
    const admin = authorize(request, 'admin')
    if (admin instanceof Response) return admin
    const file = (await request.formData()).get('file')
    if (!(file instanceof File)) return problem(400, 'Bad Request', 'Missing file.')
    const report = importUsersFromCsv(await file.text(), mockUsers)
    if (report === null) {
      return problem(400, 'Bad Request', `Expected header: ${USER_IMPORT_CSV_HEADER.join(',')}.`)
    }
    return HttpResponse.json(report satisfies UserImportReport)
  }),

  http.get('/api/core/groups', async ({ request }) => {
    await delay(300)
    const teacher = authorize(request, 'teacher')
    if (teacher instanceof Response) return teacher
    const own = mockGroups
      .filter((group) => group.teacherId === teacher.id)
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    return HttpResponse.json(own.map(toGroupSummary))
  }),

  http.post('/api/core/groups', async ({ request }) => {
    await delay(300)
    const teacher = authorize(request, 'teacher')
    if (teacher instanceof Response) return teacher
    const name = ((await request.json()) as CreateGroupRequest).name.trim()
    if (name === '' || name.length > GROUP_NAME_MAX_LENGTH) {
      return problem(400, 'Bad Request', 'Invalid group name.')
    }
    const group: MockGroup = {
      id: `g-${crypto.randomUUID()}`,
      name,
      teacherId: teacher.id,
      members: [],
      createdAt: new Date().toISOString(),
    }
    mockGroups.push(group)
    return HttpResponse.json(toGroupSummary(group), { status: 201 })
  }),

  http.get('/api/core/groups/:groupId', async ({ request, params }) => {
    await delay(250)
    const group = ownGroup(request, params.groupId)
    return group instanceof Response ? group : HttpResponse.json(toGroupDetail(group))
  }),

  http.get('/api/core/students', async ({ request }) => {
    await delay(200)
    const teacher = authorize(request, 'teacher')
    if (teacher instanceof Response) return teacher
    const query = foldText(new URL(request.url).searchParams.get('query') ?? '')
    if (query.length < STUDENT_SEARCH_MIN_LENGTH) return HttpResponse.json([])
    const matches = mockUsers
      .filter(
        (user) =>
          user.role === 'student' &&
          (foldText(user.login).includes(query) || foldText(user.displayName).includes(query)),
      )
      .sort((a, b) => a.displayName.localeCompare(b.displayName, 'pl'))
      .slice(0, 10)
      .map(({ id, login, displayName }): StudentSummary => ({ id, login, displayName }))
    return HttpResponse.json(matches)
  }),

  http.post('/api/core/groups/:groupId/students', async ({ request, params }) => {
    await delay(300)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    const { studentId } = (await request.json()) as AddGroupStudentRequest
    const student = mockUsers.find((user) => user.id === studentId && user.role === 'student')
    if (student === undefined) return problem(404, 'Not Found', 'Student not found.')
    let member = group.members.find((candidate) => candidate.studentId === studentId)
    const created = member === undefined
    if (member === undefined) {
      member = { studentId, addedAt: new Date().toISOString() }
      group.members.push(member)
    }
    return HttpResponse.json(toGroupStudent(member), { status: created ? 201 : 200 })
  }),

  http.delete('/api/core/groups/:groupId/students/:studentId', async ({ request, params }) => {
    await delay(300)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    group.members = group.members.filter((member) => member.studentId !== params.studentId)
    return new HttpResponse(null, { status: 204 })
  }),

  http.get('/api/game/groups/:groupId/config', async ({ request, params }) => {
    await delay(250)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    return HttpResponse.json(mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG)
  }),

  http.put('/api/game/groups/:groupId/config', async ({ request, params }) => {
    await delay(350)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    const body = (await request.json()) as UpdateGameConfigRequest
    const thresholds = body.ranks.map((rank) => rank.threshold)
    const invalid =
      body.currencyName.trim() === '' ||
      body.ranks.some(
        (rank) =>
          rank.name.trim() === '' ||
          !Number.isInteger(rank.threshold) ||
          rank.threshold < 0 ||
          rank.threshold > RANK_THRESHOLD_MAX,
      ) ||
      new Set(thresholds).size !== thresholds.length
    if (invalid) return problem(400, 'Bad Request', 'Invalid currency name or rank thresholds.')
    const config: GroupGameConfig = {
      currencyName: body.currencyName.trim(),
      currencyIconUrl: (mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG).currencyIconUrl,
      ranks: body.ranks.toSorted((a, b) => a.threshold - b.threshold),
    }
    mockGameConfigs.set(group.id, config)
    return HttpResponse.json(config)
  }),

  http.put('/api/game/groups/:groupId/config/currency-icon', async ({ request, params }) => {
    await delay(350)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    const file = (await request.formData()).get('file')
    if (
      !(file instanceof File) ||
      !CURRENCY_ICON_TYPES.includes(file.type) ||
      file.size > CURRENCY_ICON_MAX_BYTES
    ) {
      return problem(400, 'Bad Request', 'Icon must be PNG, GIF or WebP up to 256 KB.')
    }
    // A real service stores the file; the mock inlines it so the URL works without a server.
    const bytes = new Uint8Array(await file.arrayBuffer())
    const currencyIconUrl = `data:${file.type};base64,${btoa(String.fromCharCode(...bytes))}`
    const current = mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG
    mockGameConfigs.set(group.id, { ...current, currencyIconUrl })
    return HttpResponse.json({ currencyIconUrl } satisfies CurrencyIconResponse)
  }),

  http.delete('/api/game/groups/:groupId/config/currency-icon', async ({ request, params }) => {
    await delay(250)
    const group = ownGroup(request, params.groupId)
    if (group instanceof Response) return group
    const current = mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG
    mockGameConfigs.set(group.id, { ...current, currencyIconUrl: null })
    return new HttpResponse(null, { status: 204 })
  }),
]

/** Group owned by the calling teacher, or 404 so foreign groups are indistinguishable from missing. */
function ownGroup(request: Request, groupId: unknown): MockGroup | Response {
  const teacher = authorize(request, 'teacher')
  if (teacher instanceof Response) return teacher
  const group = mockGroups.find((candidate) => candidate.id === groupId)
  if (group === undefined || group.teacherId !== teacher.id) {
    return problem(404, 'Not Found', 'Group not found.')
  }
  return group
}

/** Case- and diacritics-insensitive form for search ("Wójcik" matches "wojcik"). */
function foldText(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/ł/g, 'l')
}

function toGroupStudent(member: MockGroup['members'][number]): GroupStudent {
  const user = mockUsers.find((candidate) => candidate.id === member.studentId)
  return {
    id: member.studentId,
    login: user?.login ?? '',
    displayName: user?.displayName ?? '',
    addedAt: member.addedAt,
  }
}

function toGroupDetail(group: MockGroup): GroupDetail {
  return {
    id: group.id,
    name: group.name,
    createdAt: group.createdAt,
    students: group.members.map(toGroupStudent),
  }
}

function toGroupSummary(group: MockGroup): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    studentCount: group.members.length,
    createdAt: group.createdAt,
  }
}
