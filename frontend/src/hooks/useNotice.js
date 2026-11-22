import { useEffect, useState } from 'react'

export const NOTICE_DURATION_MS = 2000

export function useNotice() {
  const [entry, setEntry] = useState(null)
  useEffect(() => {
    if (!entry) return undefined
    const timeout = window.setTimeout(() => setEntry(null), NOTICE_DURATION_MS)
    return () => window.clearTimeout(timeout)
  }, [entry])

  function setNotice(message) {
    setEntry(message ? { message } : null)
  }

  return [entry?.message ?? '', setNotice]
}
