import { apiRequest } from './client'
import type { UserImportReport } from './types'

export function importUsers(file: File): Promise<UserImportReport> {
  const formData = new FormData()
  formData.append('file', file)
  return apiRequest<UserImportReport>('/api/core/admin/users/import', {
    method: 'POST',
    formData,
  })
}
