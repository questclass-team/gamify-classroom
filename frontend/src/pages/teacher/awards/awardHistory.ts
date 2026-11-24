import type { HistoryEntry } from '../../../api/awardHistory'
import { dateTimeFormat } from '../../../format'

/** Who gave the award: "Ty" for the signed-in teacher; the API has no names of other teachers. */
export function awardedByLabel(awardedBy: string, currentUserId: string): string {
  return awardedBy === currentUserId ? 'Ty' : 'Inna osoba prowadząca'
}

/** "Ty, 12 lis 2026, 14:05": who and when, for one history line. */
export function historyMeta(entry: HistoryEntry, currentUserId: string): string {
  return `${awardedByLabel(entry.awardedBy, currentUserId)}, ${dateTimeFormat.format(new Date(entry.createdAt))}`
}
