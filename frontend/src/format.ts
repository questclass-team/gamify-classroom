/** Polish date like "6 paź 2026" for tables. */
export const dateFormat = new Intl.DateTimeFormat('pl-PL', { dateStyle: 'medium' })

/** Polish date and time like "12 lis 2026, 14:05" for history lines. */
export const dateTimeFormat = new Intl.DateTimeFormat('pl-PL', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

/** Polish plural: `one` for 1, `few` for 2–4 (but not 12–14), `many` otherwise. */
export function plural(count: number, one: string, few: string, many: string): string {
  if (count === 1) return one
  const lastDigit = count % 10
  const lastTwo = count % 100
  return lastDigit >= 2 && lastDigit <= 4 && (lastTwo < 12 || lastTwo > 14) ? few : many
}
