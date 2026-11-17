import { useCallback, useEffect, useState } from 'react'

export type LoadState<T> =
  { status: 'loading' } | { status: 'error'; error: unknown } | { status: 'ready'; data: T }

/**
 * Loads data once per mount (and on `reload`), aborting the request on unmount.
 * `load` must be stable (module function or useCallback); remount with `key` to load other data.
 */
export function useApiData<T>(load: (signal: AbortSignal) => Promise<T>) {
  const [state, setState] = useState<LoadState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    load(controller.signal).then(
      (data) => setState({ status: 'ready', data }),
      (error: unknown) => {
        if (!controller.signal.aborted) setState({ status: 'error', error })
      },
    )
    return () => controller.abort()
  }, [load, attempt])

  const reload = useCallback(() => {
    setState({ status: 'loading' })
    setAttempt((current) => current + 1)
  }, [])

  /** Applies a local change (e.g. after a successful POST) without refetching. */
  const update = useCallback((change: (data: T) => T) => {
    setState((current) =>
      current.status === 'ready' ? { status: 'ready', data: change(current.data) } : current,
    )
  }, [])

  return { state, reload, update }
}
