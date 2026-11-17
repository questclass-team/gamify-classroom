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

/** Error body (ASP.NET Core / RFC 9457 problem details). */
export interface ProblemDetails {
  type?: string
  title?: string
  status?: number
  detail?: string
}
