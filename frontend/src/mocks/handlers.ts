import { delay, http, HttpResponse } from 'msw'
import {
  GROUP_NAME_MAX_LENGTH,
  USER_IMPORT_CSV_HEADER,
  type CreateGroupRequest,
  type CurrentUser,
  type GroupSummary,
  type LoginRequest,
  type LoginResponse,
  type ProblemDetails,
  type Role,
  type UserImportReport,
} from '../api/types'
import { MOCK_PASSWORD, mockGroups, mockLdapOnlyLogins, mockUsers, type MockGroup } from './data'
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
      studentIds: [],
      createdAt: new Date().toISOString(),
    }
    mockGroups.push(group)
    return HttpResponse.json(toGroupSummary(group), { status: 201 })
  }),
]

function toGroupSummary(group: MockGroup): GroupSummary {
  return {
    id: group.id,
    name: group.name,
    studentCount: group.studentIds.length,
    createdAt: group.createdAt,
  }
}
