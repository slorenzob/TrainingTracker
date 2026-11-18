import { useState } from 'react'
import type { IsoDate } from '../../db/types'

const KEY = 'home.dismissedReminders'

interface Dismissed {
  date: IsoDate
  dogIds: string[]
}

function read(today: IsoDate): string[] {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY) ?? 'null') as Dismissed | null
    return saved?.date === today ? saved.dogIds : []
  } catch {
    return []
  }
}

/** Dogs whose training notice was closed today; they show again tomorrow. */
export function useDismissedReminders(today: IsoDate) {
  const [state, setState] = useState(() => ({ date: today, dogIds: read(today) }))
  // A new day (the app left open overnight) starts with every notice visible.
  const dogIds = state.date === today ? state.dogIds : read(today)

  const dismiss = (dogId: string) => {
    const next = { date: today, dogIds: [...dogIds, dogId] }
    try {
      localStorage.setItem(KEY, JSON.stringify(next))
    } catch {
      // Only hidden for this visit then.
    }
    setState(next)
  }

  return { isDismissed: (dogId: string) => dogIds.includes(dogId), dismiss }
}
