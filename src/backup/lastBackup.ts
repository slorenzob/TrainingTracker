import { useEffect, useState } from 'react'

const KEY = 'backup.lastAt'
const EVENT = 'training-tracker:backup'
/** Remind to back up when the last export is older than this. */
export const BACKUP_REMINDER_DAYS = 30

// Per-device on purpose: it describes this device's data. Storage may be unavailable.
export function getLastBackupAt(): Date | null {
  try {
    const value = localStorage.getItem(KEY)
    return value ? new Date(value) : null
  } catch {
    return null
  }
}

export function markBackupDone(at = new Date()): void {
  try {
    localStorage.setItem(KEY, at.toISOString())
  } catch {
    // Ignore: the reminder will just show again.
  }
  window.dispatchEvent(new Event(EVENT))
}

export function isBackupDue(lastAt: Date | null, hasData: boolean, now = new Date()): boolean {
  if (!hasData) return false
  if (!lastAt) return true
  return now.getTime() - lastAt.getTime() > BACKUP_REMINDER_DAYS * 24 * 60 * 60 * 1000
}

export function useLastBackupAt(): Date | null {
  const [value, setValue] = useState(getLastBackupAt)
  useEffect(() => {
    const update = () => setValue(getLastBackupAt())
    window.addEventListener(EVENT, update)
    return () => window.removeEventListener(EVENT, update)
  }, [])
  return value
}
