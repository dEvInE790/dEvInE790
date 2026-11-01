import { useCallback, useEffect, useRef, useState } from 'react'

/** Run an async loader, tracking data/loading/error, with a reload() helper. */
export default function useAsync(fn, deps = [], { enabled = true } = {}) {
  const [state, setState] = useState({ data: undefined, loading: enabled, error: null })
  const fnRef = useRef(fn)
  fnRef.current = fn
  const run = useRef(0)

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++run.current
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }))
    try {
      const data = await fnRef.current()
      if (id === run.current) setState({ data, loading: false, error: null })
      return data
    } catch (error) {
      if (id === run.current) setState((s) => ({ ...s, loading: false, error: error.message || String(error) }))
    }
  }, [])

  useEffect(() => {
    if (enabled) load()
    else setState({ data: undefined, loading: false, error: null })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, ...deps])

  const setData = useCallback((updater) => setState((s) => ({ ...s, data: typeof updater === 'function' ? updater(s.data) : updater })), [])

  return { ...state, reload: load, setData }
}
