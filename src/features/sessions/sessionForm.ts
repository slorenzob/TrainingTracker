import type { PlanExerciseWithDetails } from '../../db/plans'
import type { SessionInput } from '../../db/sessions'
import type { SessionResult } from '../../db/types'

export interface RatingDraft {
  stars?: number
  note: string
}

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

/** Builds the repository input; unrated exercises (and their notes) are left out. */
export function toSessionInput(
  date: string,
  comment: string,
  ratings: RatingsDraft,
): SessionInput | { error: 'needOneRating' } {
  const results = Object.entries(ratings)
    .filter(([, r]) => r.stars !== undefined)
    .map(([planExerciseId, r]) => ({
      planExerciseId,
      stars: r.stars!,
      ...(r.note.trim() ? { note: r.note.trim() } : {}),
    }))
  if (results.length === 0) return { error: 'needOneRating' }
  return { date, comment, results }
}
