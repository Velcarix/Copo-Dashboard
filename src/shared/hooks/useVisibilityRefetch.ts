import { useEffect, useRef } from 'react'

/**
 * Calls `onRefocus` when the tab becomes visible again after having been
 * hidden for at least `minHiddenMs` — used to silently re-validate the
 * session and reload data after the computer was suspended or the tab was
 * backgrounded for a while, instead of leaving stale numbers on screen.
 */
export function useVisibilityRefetch(onRefocus: () => void, minHiddenMs = 30_000) {
  const hiddenAtRef = useRef<number | null>(null)
  const callbackRef = useRef(onRefocus)
  callbackRef.current = onRefocus

  useEffect(() => {
    function handle() {
      if (document.visibilityState === 'hidden') {
        hiddenAtRef.current = Date.now()
        return
      }
      if (document.visibilityState === 'visible' && hiddenAtRef.current !== null) {
        const hiddenFor = Date.now() - hiddenAtRef.current
        hiddenAtRef.current = null
        if (hiddenFor >= minHiddenMs) callbackRef.current()
      }
    }
    document.addEventListener('visibilitychange', handle)
    return () => document.removeEventListener('visibilitychange', handle)
  }, [minHiddenMs])
}
