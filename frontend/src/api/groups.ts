import { apiRequest } from './client'
import type {
  AddGroupStudentRequest,
  CreateGroupRequest,
  GroupDetail,
  GroupStudent,
  GroupSummary,
  StudentSummary,
} from './types'

export function fetchGroups(signal?: AbortSignal): Promise<GroupSummary[]> {
  return apiRequest<GroupSummary[]>('/api/core/groups', { signal })
}

export function createGroup(request: CreateGroupRequest): Promise<GroupSummary> {
  return apiRequest<GroupSummary>('/api/core/groups', { method: 'POST', json: request })
}

export function fetchGroup(groupId: string, signal?: AbortSignal): Promise<GroupDetail> {
  return apiRequest<GroupDetail>(`/api/core/groups/${encodeURIComponent(groupId)}`, { signal })
}

export function searchStudents(query: string, signal?: AbortSignal): Promise<StudentSummary[]> {
  return apiRequest<StudentSummary[]>(
    `/api/core/students?${new URLSearchParams({ query }).toString()}`,
    { signal },
  )
}

export function addGroupStudent(groupId: string, studentId: string): Promise<GroupStudent> {
  return apiRequest<GroupStudent>(`/api/core/groups/${encodeURIComponent(groupId)}/students`, {
    method: 'POST',
    json: { studentId } satisfies AddGroupStudentRequest,
  })
}

export function removeGroupStudent(groupId: string, studentId: string): Promise<void> {
  return apiRequest<void>(
    `/api/core/groups/${encodeURIComponent(groupId)}/students/${encodeURIComponent(studentId)}`,
    { method: 'DELETE' },
  )
}
