import type { PlanExerciseWithDetails } from '../../db/plans'
import type { SessionInput } from '../../db/sessions'
import type { RatingDraft, SessionResult } from '../../db/types'

export type { RatingDraft }

/** Draft ratings keyed by PlanExercise id. */
export type RatingsDraft = Record<string, RatingDraft>

export const ratingsFromResults = (results: readonly SessionResult[]): RatingsDraft =>
  Object.fromEntries(results.map((r) => [r.planExerciseId, { stars: r.stars, note: r.note ?? '' }]))

/**
 * Exercises offered in the form: the plan's active ones, plus archived ones this session
 * already rated (so editing an old session doesn't silently drop them).
 */
export function exercisesForForm(
  planExercises: readonly PlanExerciseWithDetails[],
  ratings: RatingsDraft,
): PlanExerciseWithDetails[] {
  return planExercises.filter((pe) => !pe.archived || ratings[pe.id]?.stars !== undefined)
}

export const MAX_DURATION_MINUTES = 24 * 60

/**
 * Duration typed in the form, in whole minutes: empty means no duration (null), otherwise
 * it must be 1–1440. Returns seconds, as sessions store them.
 */
export function parseDurationMinutes(text: string): number | null | { error: 'invalidDuration' } {
  const value = text.trim()
  if (!value) return null
  if (!/^\d+$/.test(value)) return { error: 'invalidDuration' }
  const minutes = Number(value)
  if (minutes < 1 || minutes > MAX_DURATION_MINUTES) return { error: 'invalidDuration' }
  return minutes * 60
}

/** Stored duration shown in the minutes field (rounded; under a minute shows as 1). */
export const durationToMinutesText = (seconds: number | undefined): string =>
  seconds === undefined ? '' : String(Math.max(1, Math.round(seconds / 60)))

/**
 * Builds the repository input; unrated exercises (and their notes) are left out. The
 * duration is passed through only when given (undefined keeps the stored one on edit).
 */
export function toSessionInput(
  date: string,
  comment: string,
  ratings: RatingsDraft,
  durationSeconds?: number | null,
): SessionInput | { error: 'needOneRating' } {
  const results = Object.entries(ratings)
    .filter(([, r]) => r.stars !== undefined)
    .map(([planExerciseId, r]) => ({
      planExerciseId,
      stars: r.stars!,
      ...(r.note.trim() ? { note: r.note.trim() } : {}),
    }))
  if (results.length === 0) return { error: 'needOneRating' }
  return { date, comment, results, ...(durationSeconds !== undefined ? { durationSeconds } : {}) }
}
