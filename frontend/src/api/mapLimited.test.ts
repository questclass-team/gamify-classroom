import { describe, expect, it } from 'vitest'
import { mapLimited } from './mapLimited'

describe('mapLimited', () => {
  it('never runs more than the limit at once and keeps the order of results', async () => {
    // Each task waits until the test releases it (lib ES2023 has no Promise.withResolvers).
    const release: (() => void)[] = []
    let running = 0
    let peak = 0
    const done = mapLimited([0, 1, 2, 3, 4, 5], 2, async (item) => {
      running += 1
      peak = Math.max(peak, running)
      await new Promise<void>((resolve) => release.push(resolve))
      running -= 1
      return item * 10
    })
    // Settles pending microtasks so finished workers can pick up their next item.
    const flush = async () => {
      for (let tick = 0; tick < 10; tick += 1) await Promise.resolve()
    }
    // Release the latest started task each time, letting the pool refill in between.
    for (let released = 0; released < 6; released += 1) {
      await flush()
      expect(running).toBe(Math.min(2, 6 - released))
      release.pop()?.()
    }
    const results = await done
    expect(peak).toBe(2)
    expect(results.map((result) => result.status === 'fulfilled' && result.value)).toEqual([
      0, 10, 20, 30, 40, 50,
    ])
  })

  it('settles failures without stopping the rest', async () => {
    const results = await mapLimited(['a', 'b', 'c'], 4, async (item) => {
      if (item === 'b') throw new Error('nope')
      return item.toUpperCase()
    })
    expect(results[0]).toEqual({ status: 'fulfilled', value: 'A' })
    expect(results[1]).toMatchObject({ status: 'rejected' })
    expect(results[2]).toEqual({ status: 'fulfilled', value: 'C' })
  })

  it('handles an empty list', async () => {
    expect(await mapLimited([], 4, async () => 1)).toEqual([])
  })
})
