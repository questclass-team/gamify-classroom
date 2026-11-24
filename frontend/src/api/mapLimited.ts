/**
 * Runs `task` for every item with at most `limit` in flight and settles like Promise.allSettled,
 * results in the order of `items` (one failure never stops the others). Used where the API has
 * only per-item endpoints (balances per student, state per group).
 */
export async function mapLimited<T, R>(
  items: readonly T[],
  limit: number,
  task: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length)
  let nextIndex = 0
  async function worker() {
    while (nextIndex < items.length) {
      const index = nextIndex++
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index], index) }
      } catch (reason) {
        results[index] = { status: 'rejected', reason }
      }
    }
  }
  const workers = Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker)
  await Promise.all(workers)
  return results
}
