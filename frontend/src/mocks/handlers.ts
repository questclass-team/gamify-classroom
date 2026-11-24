import { delay, http, HttpResponse } from 'msw'
import { rankForBalance, rankProgress } from '../components/blask/ranks'
import { nicknameError, normalizeNickname } from '../pages/student/nickname'
import {
  AVATAR_KEYS,
  BADGE_DESCRIPTION_MAX_LENGTH,
  BADGE_ICONS,
  BADGE_NAME_MAX_LENGTH,
  CURRENCY_ICON_MAX_BYTES,
  CURRENCY_ICON_TYPES,
  GROUP_NAME_MAX_LENGTH,
  POINTS_MAX,
  RANK_THRESHOLD_MAX,
  REWARD_REASON_MAX_LENGTH,
  RANKING_BY,
  STUDENT_SEARCH_MIN_LENGTH,
  USER_IMPORT_CSV_HEADER,
  type AddGroupStudentRequest,
  type Badge,
  type BadgeAward,
  type BadgeIcon,
  type CreateGroupRequest,
  type CurrencyIconResponse,
  type CurrentUser,
  type GameErrorBody,
  type GroupDetail,
  type GroupRanking,
  type GroupGameConfig,
  type GroupStudent,
  type GroupSummary,
  type LoginRequest,
  type MyGroup,
  type RankingBy,
  type RankingEntry,
  type LoginResponse,
  type RefreshResponse,
  type ProblemDetails,
  type RewardHistoryItem,
  type Role,
  type StudentGroupState,
  type StudentProfile,
  type AvatarKey,
  type RosterEntry,
  type StudentProgress,
  type StudentSummary,
  type UpdateGameConfigRequest,
  type UpdateProfileRequest,
  type UpdateAvatarRequest,
  type UserImportReport,
} from '../api/types'
import {
  DEFAULT_GAME_CONFIG,
  MOCK_PASSWORD,
  mockAvatars,
  mockBadgeAwards,
  mockBadges,
  mockGameConfigs,
  mockGroups,
  mockLdapOnlyLogins,
  mockNicknames,
  mockRewards,
  mockUsers,
  type MockBadgeAward,
  type MockGroup,
  type MockReward,
} from './data'
import { createMockToken, readMockBearer } from './jwt'
import { importUsersFromCsv } from './userImport'

const TOKEN_TTL_SECONDS = 60 * 60

// Stands in for the HttpOnly refresh cookie of core: which user's session is open in this tab.
const MOCK_SESSION_KEY = 'questclass.mock-session'

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

/** A student's Core profile: what PUT /me/profile and /me/avatar return and the roster carries. */
function profileOf(studentId: string): StudentProfile {
  return {
    nickname: mockNicknames.get(studentId) ?? null,
    avatar: mockAvatars.get(studentId) ?? null,
  }
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
    sessionStorage.setItem(MOCK_SESSION_KEY, user.id)
    return HttpResponse.json({
      accessToken: createMockToken(user.id, TOKEN_TTL_SECONDS),
      user,
    } satisfies LoginResponse)
  }),

  http.post('/api/core/auth/refresh', async () => {
    await delay(150)
    const userId = sessionStorage.getItem(MOCK_SESSION_KEY)
    const user = mockUsers.find((candidate) => candidate.id === userId)
    if (user === undefined) {
      return problem(401, 'Auth.InvalidRefreshToken', 'The session has ended. Please log in again.')
    }
    return HttpResponse.json({
      accessToken: createMockToken(user.id, TOKEN_TTL_SECONDS),
      user,
    } satisfies RefreshResponse)
  }),

  http.post('/api/core/auth/logout', () => {
    sessionStorage.removeItem(MOCK_SESSION_KEY)
    return new HttpResponse(null, { status: 204 })
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

  // ---- core: the signed-in student's profile and groups ----

  http.get('/api/core/me/profile', async ({ request }) => {
    await delay(200)
    const student = authorize(request, 'student')
    if (student instanceof Response) return student
    return HttpResponse.json(profileOf(student.id))
  }),

  http.put('/api/core/me/profile', async ({ request }) => {
    await delay(350)
    const student = authorize(request, 'student')
    if (student instanceof Response) return student
    const { nickname: raw } = (await request.json()) as Partial<UpdateProfileRequest>
    if (typeof raw !== 'string' || nicknameError(raw) !== null) {
      return HttpResponse.json<ProblemDetails>(
        {
          title: 'Validation Failed',
          status: 400,
          errors: {
            Nickname: [
              "Nickname must have 3 to 24 characters: letters, digits, spaces, '_', '-' or '.', and must start and end with a letter or digit.",
            ],
          },
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    const nickname = normalizeNickname(raw)
    const key = nickname.toLowerCase()
    const taken = [...mockNicknames].some(
      ([userId, other]) => userId !== student.id && other?.toLowerCase() === key,
    )
    if (taken) {
      return problem(
        409,
        'Profile.NicknameTaken',
        'This nickname is already taken. Choose another one.',
      )
    }
    mockNicknames.set(student.id, nickname)
    return HttpResponse.json(profileOf(student.id))
  }),

  http.put('/api/core/me/avatar', async ({ request }) => {
    await delay(300)
    const student = authorize(request, 'student')
    if (student instanceof Response) return student
    // No body or no field removes the avatar too, as in Core.
    const body = (await request.json().catch(() => null)) as Partial<UpdateAvatarRequest> | null
    const avatar: unknown = body?.avatar ?? null
    if (avatar !== null && !AVATAR_KEYS.includes(avatar as AvatarKey)) {
      return HttpResponse.json<ProblemDetails>(
        {
          title: 'Validation Failed',
          status: 400,
          errors: { Avatar: [`Avatar must be null or one of: ${AVATAR_KEYS.join(', ')}.`] },
        },
        { status: 400, headers: { 'Content-Type': 'application/problem+json' } },
      )
    }
    mockAvatars.set(student.id, avatar as AvatarKey | null)
    return HttpResponse.json(profileOf(student.id))
  }),

  http.get('/api/core/me/groups', async ({ request }) => {
    await delay(300)
    const student = authorize(request, 'student')
    if (student instanceof Response) return student
    const groups = mockGroups
      .flatMap((group) => {
        const member = group.members.find((candidate) => candidate.studentId === student.id)
        if (member === undefined) return []
        const teacher = mockUsers.find((user) => user.id === group.teacherId)
        return [
          {
            id: group.id,
            name: group.name,
            teacherName: teacher?.displayName ?? '',
            joinedAt: member.addedAt,
          } satisfies MyGroup,
        ]
      })
      .sort((a, b) => a.name.localeCompare(b.name, 'pl'))
    return HttpResponse.json(groups)
  }),

  http.get('/api/core/groups/:groupId/roster', async ({ request, params }) => {
    await delay(200)
    const caller = authorize(request)
    if (caller instanceof Response) return caller
    if (caller.role === 'admin')
      return problem(403, 'Forbidden', 'Requires role teacher or student.')
    const group = mockGroups.find((candidate) => candidate.id === params.groupId)
    const allowed =
      group !== undefined &&
      (caller.role === 'teacher'
        ? group.teacherId === caller.id
        : group.members.some((member) => member.studentId === caller.id))
    if (!allowed) return problem(404, 'Groups.NotFound', 'Group not found.')
    const roster = group.members
      .map(({ studentId }): RosterEntry => ({ studentId, ...profileOf(studentId) }))
      .sort((a, b) => {
        if (a.nickname === null || b.nickname === null) {
          return Number(a.nickname === null) - Number(b.nickname === null)
        }
        return a.nickname.localeCompare(b.nickname, 'pl')
      })
    return HttpResponse.json(roster)
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

  // ---- game service: rewards, progress and badges (DRF error bodies, like the real service) ----

  http.get(
    '/api/game/groups/:groupId/students/:studentId/progress',
    async ({ request, params }) => {
      // Varied latency, so the list shows balances arriving one by one as it does for real.
      await delay(150 + Math.round(Math.random() * 450))
      const member = gameMember(request, params.groupId, params.studentId)
      if (member instanceof Response) return member
      const balance = balanceOf(member.group.id, member.studentId)
      const ranks = (mockGameConfigs.get(member.group.id) ?? DEFAULT_GAME_CONFIG).ranks
      return HttpResponse.json({
        groupId: member.group.id,
        studentId: member.studentId,
        balance,
        rank: rankForBalance(balance, ranks),
      } satisfies StudentProgress)
    },
  ),

  http.get('/api/game/groups/:groupId/students/:studentId/rewards', async ({ request, params }) => {
    await delay(250)
    const member = gameMember(request, params.groupId, params.studentId)
    if (member instanceof Response) return member
    const rewards = mockRewards
      .filter((item) => item.groupId === member.group.id && item.studentId === member.studentId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    return HttpResponse.json(rewards.map(toRewardItem))
  }),

  http.post(
    '/api/game/groups/:groupId/students/:studentId/rewards',
    async ({ request, params }) => {
      await delay(300)
      const member = gameMember(request, params.groupId, params.studentId)
      if (member instanceof Response) return member
      const body = (await request.json()) as { points?: unknown; reason?: unknown }
      const { points, reason = '' } = body
      if (typeof points !== 'number' || !Number.isInteger(points)) {
        return gameError(400, { points: ['A valid integer is required.'] })
      }
      if (points < 1 || points > POINTS_MAX) {
        return gameError(400, { points: [`Ensure this value is between 1 and ${POINTS_MAX}.`] })
      }
      if (typeof reason !== 'string' || reason.trim().length > REWARD_REASON_MAX_LENGTH) {
        return gameError(400, {
          reason: [`Ensure this field has no more than ${REWARD_REASON_MAX_LENGTH} characters.`],
        })
      }
      if (balanceOf(member.group.id, member.studentId) + points > POINTS_MAX) {
        return gameError(400, { points: 'Award would exceed the balance limit.' })
      }
      const saved: MockReward = {
        id: nextId(mockRewards),
        groupId: member.group.id,
        studentId: member.studentId,
        points,
        reason: reason.trim(),
        awardedBy: member.teacher.id,
        createdAt: new Date().toISOString(),
      }
      mockRewards.push(saved)
      return HttpResponse.json(toRewardItem(saved), { status: 201 })
    },
  ),

  http.get('/api/game/groups/:groupId/badges', async ({ request, params }) => {
    await delay(250)
    const owned = gameGroup(request, params.groupId)
    if (owned instanceof Response) return owned
    const badges = mockBadges
      .filter((badge) => badge.groupId === owned.group.id)
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id - b.id)
    return HttpResponse.json(badges)
  }),

  http.post('/api/game/groups/:groupId/badges', async ({ request, params }) => {
    await delay(300)
    const owned = gameGroup(request, params.groupId)
    if (owned instanceof Response) return owned
    const body = (await request.json()) as { name?: unknown; description?: unknown; icon?: unknown }
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const { description = '', icon = 'medal' } = body
    if (name === '' || name.length > BADGE_NAME_MAX_LENGTH) {
      return gameError(400, { name: ['Ensure this field has 1 to 40 characters.'] })
    }
    if (typeof description !== 'string' || description.length > BADGE_DESCRIPTION_MAX_LENGTH) {
      return gameError(400, { description: ['Ensure this field has no more than 200 characters.'] })
    }
    if (!BADGE_ICONS.includes(icon as BadgeIcon)) {
      return gameError(400, { icon: [`"${String(icon)}" is not a valid choice.`] })
    }
    const badge: Badge = {
      id: nextId(mockBadges),
      groupId: owned.group.id,
      name,
      description: description.trim(),
      icon: icon as BadgeIcon,
      createdAt: new Date().toISOString(),
    }
    mockBadges.push(badge)
    return HttpResponse.json(badge, { status: 201 })
  }),

  http.get('/api/game/groups/:groupId/students/:studentId/badges', async ({ request, params }) => {
    await delay(250)
    const member = gameMember(request, params.groupId, params.studentId)
    if (member instanceof Response) return member
    const awards = mockBadgeAwards
      .filter(
        (award) =>
          award.groupId === member.group.id &&
          award.studentId === member.studentId &&
          award.revokedAt === null,
      )
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    return HttpResponse.json(awards.map(toBadgeAward))
  }),

  http.post('/api/game/groups/:groupId/students/:studentId/badges', async ({ request, params }) => {
    await delay(300)
    const member = gameMember(request, params.groupId, params.studentId)
    if (member instanceof Response) return member
    const { badgeId } = (await request.json()) as { badgeId?: unknown }
    if (typeof badgeId !== 'number' || !Number.isInteger(badgeId) || badgeId < 1) {
      return gameError(400, { badgeId: ['A valid integer is required.'] })
    }
    const badge = mockBadges.find((item) => item.id === badgeId && item.groupId === member.group.id)
    if (badge === undefined) return gameError(404, { detail: 'Badge not found.' })
    const active = mockBadgeAwards.some(
      (award) =>
        award.badgeId === badgeId &&
        award.studentId === member.studentId &&
        award.revokedAt === null,
    )
    if (active) return gameError(409, { detail: 'This student already has this badge.' })
    const award: MockBadgeAward = {
      id: nextId(mockBadgeAwards),
      groupId: member.group.id,
      badgeId,
      studentId: member.studentId,
      awardedBy: member.teacher.id,
      createdAt: new Date().toISOString(),
      revokedAt: null,
    }
    mockBadgeAwards.push(award)
    return HttpResponse.json(toBadgeAward(award), { status: 201 })
  }),

  http.delete(
    '/api/game/groups/:groupId/students/:studentId/badges/:awardId',
    async ({ request, params }) => {
      await delay(300)
      const member = gameMember(request, params.groupId, params.studentId)
      if (member instanceof Response) return member
      const award = mockBadgeAwards.find(
        (item) =>
          String(item.id) === params.awardId &&
          item.groupId === member.group.id &&
          item.studentId === member.studentId,
      )
      if (award === undefined) return gameError(404, { detail: 'Badge award not found.' })
      award.revokedAt ??= new Date().toISOString()
      return new HttpResponse(null, { status: 204 })
    },
  ),

  // ---- game service: the student's own state and the group ranking ----

  http.get('/api/game/groups/:groupId/me', async ({ request, params }) => {
    await delay(200 + Math.round(Math.random() * 400))
    const caller = gameCaller(request)
    if (caller instanceof Response) return caller
    if (caller.role !== 'student') {
      return gameError(403, { detail: 'You do not have permission to perform this action.' })
    }
    const group = mockGroups.find((candidate) => candidate.id === params.groupId)
    if (group?.members.some((member) => member.studentId === caller.id) !== true) {
      return gameError(404, { detail: 'Group not found.' })
    }
    const config = mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG
    const balance = balanceOf(group.id, caller.id)
    const { current, next } = rankProgress(balance, config.ranks)
    const rewards = mockRewards
      .filter((item) => item.groupId === group.id && item.studentId === caller.id)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
    return HttpResponse.json({
      groupId: group.id,
      ...profileOf(caller.id),
      currencyName: config.currencyName,
      currencyIconUrl: config.currencyIconUrl,
      balance,
      rank: current,
      nextRank: next,
      badges: activeAwards(group.id, caller.id).map(toBadgeAward),
      rewards: rewards.map(toRewardItem),
    } satisfies StudentGroupState)
  }),

  http.get('/api/game/groups/:groupId/ranking', async ({ request, params }) => {
    await delay(300)
    const caller = gameCaller(request)
    if (caller instanceof Response) return caller
    if (caller.role === 'admin') {
      return gameError(403, { detail: 'You do not have permission to perform this action.' })
    }
    const by = new URL(request.url).searchParams.get('by') ?? 'points'
    if (!RANKING_BY.includes(by as RankingBy)) {
      return gameError(400, { by: [`"${by}" is not a valid choice.`] })
    }
    const group = mockGroups.find((candidate) => candidate.id === params.groupId)
    const allowed =
      group !== undefined &&
      (caller.role === 'teacher'
        ? group.teacherId === caller.id
        : group.members.some((member) => member.studentId === caller.id))
    if (!allowed) return gameError(404, { detail: 'Group not found.' })
    const config = mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG
    return HttpResponse.json({
      groupId: group.id,
      by: by as RankingBy,
      currencyName: config.currencyName,
      currencyIconUrl: config.currencyIconUrl,
      entries: rankingEntries(group, by as RankingBy, caller),
    } satisfies GroupRanking)
  }),
]

/** Token check of the game service for endpoints open to several roles (401 without a user). */
function gameCaller(request: Request): CurrentUser | Response {
  const userId = readMockBearer(request.headers.get('Authorization'))
  const user = mockUsers.find((candidate) => candidate.id === userId)
  return user ?? gameError(401, { detail: 'Authentication credentials were not provided.' })
}

function activeAwards(groupId: string, studentId: string): MockBadgeAward[] {
  return mockBadgeAwards
    .filter(
      (award) =>
        award.groupId === groupId && award.studentId === studentId && award.revokedAt === null,
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id - a.id)
}

/**
 * The game service's ranking: every member, by the primary criterion, then the other one, then
 * nickname (nulls last, ignoring case), then a hidden stable key; competition positions (1, 1, 3)
 * on the primary criterion. Only nicknames leave the mock, never ids, names or logins.
 */
function rankingEntries(group: MockGroup, by: RankingBy, caller: CurrentUser): RankingEntry[] {
  const ranks = (mockGameConfigs.get(group.id) ?? DEFAULT_GAME_CONFIG).ranks
  const rows = group.members.map(({ studentId }) => {
    const balance = balanceOf(group.id, studentId)
    return {
      key: studentId,
      ...profileOf(studentId),
      balance,
      rank: rankForBalance(balance, ranks),
      badgeCount: activeAwards(group.id, studentId).length,
      isMe: caller.role === 'student' && caller.id === studentId,
    }
  })
  type Row = (typeof rows)[number]
  const primary = (row: Row) => (by === 'points' ? row.balance : row.badgeCount)
  const secondary = (row: Row) => (by === 'points' ? row.badgeCount : row.balance)
  const byNickname = (a: Row, b: Row) => {
    if (a.nickname === null || b.nickname === null) {
      return Number(a.nickname === null) - Number(b.nickname === null)
    }
    const [left, right] = [a.nickname.toLowerCase(), b.nickname.toLowerCase()]
    return left < right ? -1 : left > right ? 1 : 0
  }
  rows.sort(
    (a, b) =>
      primary(b) - primary(a) ||
      secondary(b) - secondary(a) ||
      byNickname(a, b) ||
      a.key.localeCompare(b.key),
  )
  let position = 0
  return rows.map(({ nickname, avatar, balance, rank, badgeCount, isMe }, index) => {
    if (index === 0 || primary(rows[index - 1]) !== primary(rows[index])) position = index + 1
    return { position, nickname, avatar, balance, rank, badgeCount, isMe }
  })
}

function gameError(status: number, body: GameErrorBody) {
  return HttpResponse.json(body, { status })
}

/**
 * The game service's checks: a teacher token (401/403 otherwise) and a group the teacher owns in
 * Core (404 for foreign or missing groups, so they look the same).
 */
function gameGroup(
  request: Request,
  groupId: unknown,
): { teacher: CurrentUser; group: MockGroup } | Response {
  const userId = readMockBearer(request.headers.get('Authorization'))
  const user = mockUsers.find((candidate) => candidate.id === userId)
  if (user === undefined) {
    return gameError(401, { detail: 'Authentication credentials were not provided.' })
  }
  if (user.role !== 'teacher') {
    return gameError(403, { detail: 'You do not have permission to perform this action.' })
  }
  const group = mockGroups.find((candidate) => candidate.id === groupId)
  if (group === undefined || group.teacherId !== user.id) {
    return gameError(404, { detail: 'Group not found.' })
  }
  return { teacher: user, group }
}

/** `gameGroup` plus the student's current membership (404 for a student outside the group). */
function gameMember(
  request: Request,
  groupId: unknown,
  studentId: unknown,
): { teacher: CurrentUser; group: MockGroup; studentId: string } | Response {
  const owned = gameGroup(request, groupId)
  if (owned instanceof Response) return owned
  const member = owned.group.members.find((candidate) => candidate.studentId === studentId)
  if (member === undefined) return gameError(404, { detail: 'Group not found.' })
  return { ...owned, studentId: member.studentId }
}

function balanceOf(groupId: string, studentId: string): number {
  return mockRewards
    .filter((item) => item.groupId === groupId && item.studentId === studentId)
    .reduce((sum, item) => sum + item.points, 0)
}

function nextId(items: readonly { id: number }[]): number {
  return Math.max(0, ...items.map((item) => item.id)) + 1
}

function toRewardItem({ id, points, reason, studentId, awardedBy, createdAt }: MockReward) {
  return { id, points, reason, studentId, awardedBy, createdAt } satisfies RewardHistoryItem
}

function toBadgeAward(award: MockBadgeAward): BadgeAward {
  const badge = mockBadges.find((item) => item.id === award.badgeId)
  if (badge === undefined) throw new Error(`Mock badge ${award.badgeId} is missing.`)
  const { id, badgeId, studentId, awardedBy, createdAt } = award
  return { id, badgeId, badge, studentId, awardedBy, createdAt }
}

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
