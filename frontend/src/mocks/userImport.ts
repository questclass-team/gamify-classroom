import {
  USER_IMPORT_CSV_HEADER,
  type CurrentUser,
  type Role,
  type UserImportReport,
} from '../api/types'

const ROLES: readonly string[] = ['student', 'teacher', 'admin'] satisfies Role[]

/**
 * Mock of the core import: adds new accounts to `users` in place.
 * Returns null when the header is missing or wrong (backend answers 400).
 */
export function importUsersFromCsv(text: string, users: CurrentUser[]): UserImportReport | null {
  const lines = text.replace(/^\uFEFF/, '').split(/\r?\n/)
  const delimiter = lines[0].includes(';') ? ';' : ','
  const header = lines[0].split(delimiter).map((cell) => cell.trim().toLowerCase())
  if (header.join() !== USER_IMPORT_CSV_HEADER.join()) return null

  const report: UserImportReport = { created: [], skipped: [] }
  const seenInFile = new Set<string>()

  lines.forEach((raw, index) => {
    const line = index + 1
    if (line === 1 || raw.trim() === '') return
    const [loginCell = '', firstName = '', lastName = '', roleCell = ''] = raw
      .split(delimiter)
      .map((cell) => cell.trim())
    const login = loginCell.toLowerCase()
    const role = roleCell.toLowerCase()

    if (login === '' || firstName === '' || lastName === '' || role === '') {
      report.skipped.push({ line, login: login || null, reason: 'missing_field' })
    } else if (!ROLES.includes(role)) {
      report.skipped.push({ line, login, reason: 'invalid_role' })
    } else if (seenInFile.has(login)) {
      report.skipped.push({ line, login, reason: 'duplicate_in_file' })
    } else if (users.some((user) => user.login === login)) {
      seenInFile.add(login)
      report.skipped.push({ line, login, reason: 'already_exists' })
    } else {
      seenInFile.add(login)
      const user: CurrentUser = {
        id: `u-${login}`,
        login,
        displayName: `${firstName} ${lastName}`,
        role: role as Role,
      }
      users.push(user)
      report.created.push({ line, login, displayName: user.displayName, role: user.role })
    }
  })

  return report
}
