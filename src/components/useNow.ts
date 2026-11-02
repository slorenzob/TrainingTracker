import { useEffect, useState } from 'react'

/** Current time, refreshed every `intervalMs` while `active` (e.g. to drive a timer). */
export function useNow(active: boolean, intervalMs = 1000): Date {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    setNow(new Date())
    if (!active) return
    const timer = setInterval(() => setNow(new Date()), intervalMs)
    return () => clearInterval(timer)
  }, [active, intervalMs])
  return now
}
