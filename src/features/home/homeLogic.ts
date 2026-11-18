import type { IsoDate } from '../../db/types'
import { toIsoDate } from '../../db/utils'
import { parseIsoDate } from '../../i18n/format'

/** Weeks shown in the home activity calendar. */
export const ACTIVITY_WEEKS = 12

const DAY_MS = 24 * 60 * 60 * 1000

/** Whole days from `from` to `to` (positive when `to` is later). */
export const daysBetween = (from: IsoDate, to: IsoDate): number =>
  Math.round((parseIsoDate(to).getTime() - parseIsoDate(from).getTime()) / DAY_MS)

/**
 * Days of the activity calendar, week by week (Monday first) and ending with the week of
 * `today`, so its last days may still be in the future.
 */
export function activityDays(today: Date, weeks = ACTIVITY_WEEKS): IsoDate[] {
  const mondayOffset = (today.getDay() + 6) % 7
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  start.setDate(start.getDate() - mondayOffset - (weeks - 1) * 7)
  return Array.from({ length: weeks * 7 }, (_, i) =>
    toIsoDate(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)),
  )
}

/** Colour step of a calendar day: none, one session, or two or more. */
export const activityLevel = (sessions: number): 0 | 1 | 2 =>
  sessions >= 2 ? 2 : sessions === 1 ? 1 : 0
