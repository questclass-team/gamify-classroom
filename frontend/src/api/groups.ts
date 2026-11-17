import { apiRequest } from './client'
import type { CreateGroupRequest, GroupSummary } from './types'

export function fetchGroups(signal?: AbortSignal): Promise<GroupSummary[]> {
  return apiRequest<GroupSummary[]>('/api/core/groups', { signal })
}

export function createGroup(request: CreateGroupRequest): Promise<GroupSummary> {
  return apiRequest<GroupSummary>('/api/core/groups', { method: 'POST', json: request })
}
