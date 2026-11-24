import { apiRequest } from './client'
import type { AwardPointsRequest, RewardHistoryItem, StudentProgress } from './types'

function studentUrl(groupId: string, studentId: string): string {
  return `/api/game/groups/${encodeURIComponent(groupId)}/students/${encodeURIComponent(studentId)}`
}

export function fetchStudentProgress(
  groupId: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<StudentProgress> {
  return apiRequest<StudentProgress>(`${studentUrl(groupId, studentId)}/progress`, { signal })
}

export function fetchRewardHistory(
  groupId: string,
  studentId: string,
  signal?: AbortSignal,
): Promise<RewardHistoryItem[]> {
  return apiRequest<RewardHistoryItem[]>(`${studentUrl(groupId, studentId)}/rewards`, { signal })
}

export function awardPoints(
  groupId: string,
  studentId: string,
  request: AwardPointsRequest,
): Promise<RewardHistoryItem> {
  return apiRequest<RewardHistoryItem>(`${studentUrl(groupId, studentId)}/rewards`, {
    method: 'POST',
    json: request,
  })
}
