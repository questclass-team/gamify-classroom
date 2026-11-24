import { apiRequest } from './client'
import type { AwardBadgeRequest, Badge, BadgeAward, CreateBadgeRequest } from './types'

function badgesUrl(groupId: string): string {
  return `/api/game/groups/${encodeURIComponent(groupId)}/badges`
}

function studentBadgesUrl(groupId: string, studentId: string): string {
  return `/api/game/groups/${encodeURIComponent(groupId)}/students/${encodeURIComponent(studentId)}/badges`
}

export function fetchBadges(groupId: string, signal?: AbortSignal): Promise<Badge[]> {
  return apiRequest<Badge[]>(badgesUrl(groupId), { signal })
}

export function createBadge(groupId: string, request: CreateBadgeRequest): Promise<Badge> {
  return apiRequest<Badge>(badgesUrl(groupId), { method: 'POST', json: request })
}

export function fetchStudentBadges(
  groupId: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<BadgeAward[]> {
  return apiRequest<BadgeAward[]>(studentBadgesUrl(groupId, studentId), { signal })
}

/** Rejects with ApiError 409 when the student already has this badge active. */
export function awardBadge(
  groupId: string,
  studentId: string,
  badgeId: number,
): Promise<BadgeAward> {
  return apiRequest<BadgeAward>(studentBadgesUrl(groupId, studentId), {
    method: 'POST',
    json: { badgeId } satisfies AwardBadgeRequest,
  })
}

export function revokeBadge(groupId: string, studentId: string, awardId: number): Promise<void> {
  return apiRequest<void>(`${studentBadgesUrl(groupId, studentId)}/${awardId}`, {
    method: 'DELETE',
  })
}
