// Single source of truth for API request/response shapes.
// Backends are not ready yet: these types are the frontend's proposed contract,
// served by MSW mocks (src/mocks). Align with core/game and update here only.

export type Role = 'student' | 'teacher' | 'admin'

export interface CurrentUser {
  id: string
  /** Faculty LDAP login (LABS domain). */
  login: string
  displayName: string
  role: Role
}

/** POST /api/core/auth/login */
export interface LoginRequest {
  login: string
  password: string
}

/**
 * 200 from POST /api/core/auth/login.
 * 401 – wrong LDAP credentials, 403 – valid LDAP account that was not imported.
 */
export interface LoginResponse {
  /** JWT sent back as `Authorization: Bearer <token>`; must contain `exp`. */
  accessToken: string
  user: CurrentUser
}

// GET /api/core/auth/me -> CurrentUser

/**
 * Login also sets the HttpOnly cookie `qc_refresh` (JavaScript never sees it; the session lasts at most 8 h).
 *
 * POST /api/core/auth/refresh (no body, no Authorization header; the browser sends the cookie)
 *   -> 200 RefreshResponse and usually a new cookie; 401 when the session is over (log in again).
 * POST /api/core/auth/logout -> 204; ends the session and removes the cookie.
 */
export type RefreshResponse = LoginResponse

/**
 * CSV accepted by POST /api/core/admin/users/import (multipart field `file`, admin only).
 * First line is the header; `,` or `;` as delimiter; role is one of `Role`.
 */
export const USER_IMPORT_CSV_HEADER = ['login', 'first_name', 'last_name', 'role'] as const

export type ImportSkipReason =
  /** Account with this login was imported before; it is left unchanged. */
  | 'already_exists'
  /** Login appears earlier in the same file. */
  | 'duplicate_in_file'
  | 'missing_field'
  /** Login has characters other than letters, digits, '.', '_' and '-', or is longer than 64. */
  | 'invalid_login'
  | 'invalid_role'

export interface ImportedUser {
  /** 1-based line number in the file (header is line 1). */
  line: number
  login: string
  displayName: string
  role: Role
}

export interface SkippedImportRow {
  line: number
  /** Null when the row has no login at all. */
  login: string | null
  reason: ImportSkipReason
}

/** 200 from the import endpoint; 400 when the file has no valid header. */
export interface UserImportReport {
  created: ImportedUser[]
  skipped: SkippedImportRow[]
}

export const GROUP_NAME_MAX_LENGTH = 100

/** Item of GET /api/core/groups: only groups owned by the calling teacher. */
export interface GroupSummary {
  id: string
  name: string
  studentCount: number
  /** ISO 8601 timestamp. */
  createdAt: string
}

/**
 * POST /api/core/groups -> 201 GroupSummary.
 * 400 when the trimmed name is empty or longer than GROUP_NAME_MAX_LENGTH.
 */
export interface CreateGroupRequest {
  name: string
}

/** Imported student account; also an item of GET /api/core/students?query=. */
export interface StudentSummary {
  id: string
  login: string
  displayName: string
}

export interface GroupStudent extends StudentSummary {
  /** ISO 8601 timestamp of joining the group. */
  addedAt: string
}

/**
 * GET /api/core/groups/{groupId} -> GroupDetail.
 * 404 when the group does not exist or belongs to another teacher.
 */
export interface GroupDetail {
  id: string
  name: string
  createdAt: string
  students: GroupStudent[]
}

/** Minimum query length for GET /api/core/students (matches login or name, max 10 results). */
export const STUDENT_SEARCH_MIN_LENGTH = 2

/**
 * POST /api/core/groups/{groupId}/students -> GroupStudent.
 * Idempotent: an existing member is returned unchanged (200), never duplicated.
 * 404 when the group is not the caller's or the account is not an imported student.
 *
 * DELETE /api/core/groups/{groupId}/students/{studentId} -> 204 (also when not a member).
 */
export interface AddGroupStudentRequest {
  studentId: string
}

// ---- core service: the signed-in student's profile and groups (student only, 403 for others) ----

export const NICKNAME_MIN_LENGTH = 3
export const NICKNAME_MAX_LENGTH = 24

/**
 * The ready-made avatars (Core `Avatars.Keys`), in Core's order, which is also the picker's. Core
 * stores and checks only the key; the frontend draws one picture per key (components/blask/art.ts).
 */
export const AVATAR_KEYS = [
  'fox',
  'owl',
  'hedgehog',
  'cat',
  'wolf',
  'raven',
  'dragon',
  'phoenix',
  'comet',
  'star',
  'moon',
  'planet',
  'spark',
  'aurora',
  'wave',
  'galaxy',
] as const

export type AvatarKey = (typeof AVATAR_KEYS)[number]

/**
 * GET /api/core/me/profile -> StudentProfile; the nickname and the avatar are null until the
 * student sets them. Rankings show only nicknames and avatars and never fall back to a name or
 * login.
 */
export interface StudentProfile {
  nickname: string | null
  avatar: AvatarKey | null
}

/**
 * PUT /api/core/me/profile -> 200 StudentProfile with the nickname as stored (trimmed, NFC).
 * 400 problem details with `errors.Nickname` when it breaks the rules: NICKNAME_MIN_LENGTH to
 * NICKNAME_MAX_LENGTH characters of letters (with combining marks) and digits of any script,
 * spaces, '_', '-' and '.', starting and ending with a letter or digit.
 * 409 `Profile.NicknameTaken` when another account has it in any letter case.
 */
export interface UpdateProfileRequest {
  nickname: string
}

/**
 * PUT /api/core/me/avatar -> 200 StudentProfile; `null` removes the avatar. Saved independently
 * of the nickname. 400 problem details with `errors.Avatar` for a key outside AVATAR_KEYS.
 */
export interface UpdateAvatarRequest {
  avatar: AvatarKey | null
}

/**
 * Item of GET /api/core/groups/{groupId}/roster (the group's teacher or a student in it): current
 * members by nickname in Polish alphabetical order, students without one last; no names or logins.
 * The game service reads it for rankings; 404 `Groups.NotFound` for a group outside the caller's.
 */
export interface RosterEntry {
  studentId: string
  nickname: string | null
  avatar: AvatarKey | null
}

/**
 * Item of GET /api/core/me/groups: the groups the caller is a member of, in Polish alphabetical
 * order; [] when none.
 */
export interface MyGroup {
  id: string
  name: string
  /** Display name of the group's teacher (never another student's). */
  teacherName: string
  /** ISO 8601 timestamp of joining the group. */
  joinedAt: string
}

// ---- game service: points (story currency) and ranks per group ----

export const CURRENCY_NAME_MAX_LENGTH = 30
export const RANK_NAME_MAX_LENGTH = 40
export const MAX_RANKS = 20
export const RANK_THRESHOLD_MAX = 1_000_000
export const CURRENCY_ICON_MAX_BYTES = 256 * 1024
export const CURRENCY_ICON_TYPES = ['image/png', 'image/gif', 'image/webp']

export interface Rank {
  name: string
  /** Balance needed to reach the rank: integer, 0…RANK_THRESHOLD_MAX, unique within a group. */
  threshold: number
}

/**
 * GET /api/game/groups/{groupId}/config -> GroupGameConfig (defaults when never configured).
 * 404 when the group does not exist or belongs to another teacher.
 */
export interface GroupGameConfig {
  currencyName: string
  /** Null when no icon was uploaded. */
  currencyIconUrl: string | null
  /** Sorted by threshold, ascending. */
  ranks: Rank[]
}

/**
 * PUT /api/game/groups/{groupId}/config -> GroupGameConfig.
 * 400 when a name is empty/too long or thresholds are negative, non-integer or repeated.
 */
export interface UpdateGameConfigRequest {
  currencyName: string
  ranks: Rank[]
}

/**
 * PUT /api/game/groups/{groupId}/config/currency-icon (multipart field `file`) -> CurrencyIconResponse.
 * 400 for other types than CURRENCY_ICON_TYPES or files over CURRENCY_ICON_MAX_BYTES.
 * DELETE on the same URL removes the icon -> 204.
 */
export interface CurrencyIconResponse {
  currencyIconUrl: string
}

// ---- game service: point rewards, progress and badges per group (teacher only) ----

export const REWARD_REASON_MAX_LENGTH = 200
/** Largest single award and largest balance (32-bit signed integer). */
export const POINTS_MAX = 2_147_483_647
export const BADGE_NAME_MAX_LENGTH = 40
export const BADGE_DESCRIPTION_MAX_LENGTH = 200
export const BADGE_ICONS = ['medal', 'star', 'trophy'] as const

/** A rank as embedded in progress responses (same shape as a configured `Rank`). */
export type RankRef = Rank

/**
 * POST /api/game/groups/{groupId}/students/{studentId}/rewards -> 201 RewardHistoryItem.
 * 400 when `points` is not a JSON integer in 1…POINTS_MAX, the reason is longer than
 * REWARD_REASON_MAX_LENGTH or the new balance would exceed POINTS_MAX (errors keyed by field).
 * 404 when the group is not the caller's or the student is not a member; 503 when Core is down.
 */
export interface AwardPointsRequest {
  points: number
  /** Optional, may be empty. */
  reason?: string
}

/** Item of GET …/students/{studentId}/rewards (newest first) and the POST response. */
export interface RewardHistoryItem {
  id: number
  points: number
  reason: string
  studentId: string
  /** Id (JWT `sub`) of the teacher who gave the reward. */
  awardedBy: string
  /** ISO 8601 timestamp. */
  createdAt: string
}

/**
 * GET /api/game/groups/{groupId}/students/{studentId}/progress -> StudentProgress.
 * Balance 0 and the rank for 0 when the student was never awarded.
 */
export interface StudentProgress {
  groupId: string
  studentId: string
  balance: number
  /** Highest rank whose threshold is at or below the balance; null when none qualifies. */
  rank: RankRef | null
}

export type BadgeIcon = (typeof BADGE_ICONS)[number]

/**
 * Badge of a group. GET /api/game/groups/{groupId}/badges -> Badge[] ordered by `createdAt`, then
 * `id` (oldest first; [] when none). PATCH …/badges/{badgeId} with any CreateBadgeRequest fields
 * -> 200 Badge; 404 when the badge is not in that group.
 */
export interface Badge {
  id: number
  groupId: string
  name: string
  description: string
  icon: BadgeIcon
  createdAt: string
}

/**
 * POST /api/game/groups/{groupId}/badges -> 201 Badge.
 * 400 when the trimmed name is empty or longer than BADGE_NAME_MAX_LENGTH, the description is
 * longer than BADGE_DESCRIPTION_MAX_LENGTH or the icon is not one of BADGE_ICONS.
 */
export interface CreateBadgeRequest {
  name: string
  /** Defaults to "". */
  description?: string
  /** Defaults to "medal". */
  icon?: BadgeIcon
}

/**
 * POST /api/game/groups/{groupId}/students/{studentId}/badges -> 201 BadgeAward.
 * 409 `badge_already_awarded` when the student already has this badge active; 404 for a badge
 * outside the group or a student who is not a member. Awarding never changes the balance.
 */
export interface AwardBadgeRequest {
  badgeId: number
}

/**
 * Active award: item of GET …/students/{studentId}/badges (newest first) and the POST response.
 * DELETE …/students/{studentId}/badges/{awardId} revokes it -> 204 (also when already revoked);
 * revoked awards are not listed and a new award gets a new id.
 */
export interface BadgeAward {
  id: number
  badgeId: number
  badge: Badge
  studentId: string
  awardedBy: string
  createdAt: string
}

// ---- game service: the student's own state and the group ranking ----

/**
 * GET /api/game/groups/{groupId}/me -> StudentGroupState (a student who is a member).
 * 403 for teachers and admins; 404 when the caller is not in the group or it does not exist.
 */
export interface StudentGroupState {
  groupId: string
  /** The caller's nickname from Core, null until set. */
  nickname: string | null
  /** The caller's avatar from Core, null when none is chosen. */
  avatar: AvatarKey | null
  currencyName: string
  currencyIconUrl: string | null
  /** 0 when never awarded. */
  balance: number
  /** Null when no rank is reached (or the group has no ranks). */
  rank: RankRef | null
  /** Null at the top rank or when the group has no ranks. */
  nextRank: RankRef | null
  /** Active badge awards, newest first. */
  badges: BadgeAward[]
  /** Point rewards, newest first. */
  rewards: RewardHistoryItem[]
}

export const RANKING_BY = ['points', 'badges'] as const
export type RankingBy = (typeof RANKING_BY)[number]

/** One member in a ranking: only the nickname, never a name, login or id. */
export interface RankingEntry {
  /** Standard competition ranking on the primary criterion (1, 1, 3). */
  position: number
  nickname: string | null
  /** Null when the student has not chosen one (shown as the neutral mark, never initials). */
  avatar: AvatarKey | null
  balance: number
  rank: RankRef | null
  /** Active badge awards in this group. */
  badgeCount: number
  /** True only for the calling student (always false for a teacher). */
  isMe: boolean
}

/**
 * GET /api/game/groups/{groupId}/ranking?by=points|badges (default points) -> GroupRanking, for a
 * member student or the owning teacher. Every member is an entry, ordered by the primary criterion
 * (balance or badgeCount), then the other one, then nickname (nulls last). 400 `{ "by": [...] }`
 * for another `by`; 404 when the caller is not in the group; 403 for admins.
 */
export interface GroupRanking {
  groupId: string
  by: RankingBy
  currencyName: string
  currencyIconUrl: string | null
  entries: RankingEntry[]
}

/**
 * Game service errors are Django REST framework bodies, not problem details: `{ "detail": "…" }`
 * for 403/404/409/503 and `{ "<field>": ["…"] }` for 400.
 */
export type GameErrorBody = { detail?: string } & Record<string, unknown>

/** Error body (ASP.NET Core / RFC 9457 problem details). */
export interface ProblemDetails {
  type?: string
  /** Core puts its error code here, e.g. `Profile.NicknameTaken`. */
  title?: string
  status?: number
  detail?: string
  /** Validation errors by PascalCase field name (400 from Core), e.g. `{ "Nickname": ["…"] }`. */
  errors?: Record<string, string[]>
}
