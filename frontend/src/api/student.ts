import { apiRequest } from './client'
import type {
  AvatarKey,
  GroupRanking,
  MyGroup,
  RankingBy,
  StudentGroupState,
  StudentProfile,
  UpdateAvatarRequest,
  UpdateProfileRequest,
} from './types'

// ---- core: the signed-in student's profile and groups ----

export function fetchMyProfile(signal?: AbortSignal): Promise<StudentProfile> {
  return apiRequest<StudentProfile>('/api/core/me/profile', { signal })
}

/** Rejects with ApiError 400 (`errors.Nickname`) or 409 (`Profile.NicknameTaken`). */
export function saveMyProfile(request: UpdateProfileRequest): Promise<StudentProfile> {
  return apiRequest<StudentProfile>('/api/core/me/profile', { method: 'PUT', json: request })
}

/** `null` removes the avatar. Rejects with ApiError 400 (`errors.Avatar`) for an unknown key. */
export function saveAvatar(avatar: AvatarKey | null): Promise<StudentProfile> {
  return apiRequest<StudentProfile>('/api/core/me/avatar', {
    method: 'PUT',
    json: { avatar } satisfies UpdateAvatarRequest,
  })
}

export function fetchMyGroups(signal?: AbortSignal): Promise<MyGroup[]> {
  return apiRequest<MyGroup[]>('/api/core/me/groups', { signal })
}

// ---- game: the student's state in a group and the group ranking ----

function groupUrl(groupId: string): string {
  return `/api/game/groups/${encodeURIComponent(groupId)}`
}

export function fetchMyGroupState(
  groupId: string,
  signal?: AbortSignal,
): Promise<StudentGroupState> {
  return apiRequest<StudentGroupState>(`${groupUrl(groupId)}/me`, { signal })
}

export function fetchGroupRanking(
  groupId: string,
  by: RankingBy,
  signal?: AbortSignal,
): Promise<GroupRanking> {
  return apiRequest<GroupRanking>(
    `${groupUrl(groupId)}/ranking?${new URLSearchParams({ by }).toString()}`,
    { signal },
  )
}
