import { apiRequest } from './client'
import type { CurrencyIconResponse, GroupGameConfig, UpdateGameConfigRequest } from './types'

function configUrl(groupId: string): string {
  return `/api/game/groups/${encodeURIComponent(groupId)}/config`
}

export function fetchGameConfig(groupId: string, signal?: AbortSignal): Promise<GroupGameConfig> {
  return apiRequest<GroupGameConfig>(configUrl(groupId), { signal })
}

export function saveGameConfig(
  groupId: string,
  request: UpdateGameConfigRequest,
): Promise<GroupGameConfig> {
  return apiRequest<GroupGameConfig>(configUrl(groupId), { method: 'PUT', json: request })
}

export function uploadCurrencyIcon(groupId: string, file: File): Promise<CurrencyIconResponse> {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<CurrencyIconResponse>(`${configUrl(groupId)}/currency-icon`, {
    method: 'PUT',
    formData,
  })
}

export function deleteCurrencyIcon(groupId: string): Promise<void> {
  return apiRequest<void>(`${configUrl(groupId)}/currency-icon`, { method: 'DELETE' })
}
