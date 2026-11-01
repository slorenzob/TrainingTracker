import { getPlanExercises, type PlanExerciseWithDetails } from './plans'
import { db } from './schema'
import { averageStars } from './sessions'
import type { IsoDate, Stars } from './types'

export interface ExerciseStats extends PlanExerciseWithDetails {
  /** Sessions of this plan in which the exercise was rated. */
  timesPracticed: number
  average?: number
  lastStars?: Stars
  lastDate?: IsoDate
}

export interface PlanSummary {
  sessionCount: number
  lastSessionDate?: IsoDate
  /** Mean of every rating in the plan's sessions. */
  overallAverage?: number
  /** Plan order; archived exercises that were rated come last. */
  exercises: ExerciseStats[]
  /** Active exercises practised less than the most practised one, fewest first (max 3). */
  leastPracticed: ExerciseStats[]
}

export async function getPlanSummary(planId: string): Promise<PlanSummary> {
  const [planExercises, sessions] = await Promise.all([
    getPlanExercises(planId, { includeArchived: true }),
    db.sessions.where('planId').equals(planId).toArray(),
  ])
  const dateBySession = new Map(sessions.map((s) => [s.id, s.date]))
  const results = await db.sessionResults
    .where('sessionId')
    .anyOf([...dateBySession.keys()])
    .toArray()

  const exercises = planExercises
    .map((pe): ExerciseStats => {
      const own = results
        .filter((r) => r.planExerciseId === pe.id)
        .map((r) => ({ ...r, date: dateBySession.get(r.sessionId)! }))
        .sort((a, b) => a.date.localeCompare(b.date))
      const last = own.at(-1)
      return {
        ...pe,
        timesPracticed: own.length,
        average: averageStars(own),
        lastStars: last?.stars,
        lastDate: last?.date,
      }
    })
    .filter((e) => !e.archived || e.timesPracticed > 0)
    .sort((a, b) => Number(a.archived) - Number(b.archived))

  const active = exercises.filter((e) => !e.archived)
  const most = Math.max(0, ...active.map((e) => e.timesPracticed))
  const leastPracticed =
    sessions.length === 0
      ? []
      : active
          .filter((e) => e.timesPracticed < most)
          .sort((a, b) => a.timesPracticed - b.timesPracticed)
          .slice(0, 3)

  const lastSessionDate = sessions
    .map((s) => s.date)
    .sort()
    .at(-1)
  return {
    sessionCount: sessions.length,
    lastSessionDate,
    overallAverage: averageStars(results),
    exercises,
    leastPracticed,
  }
}

export interface ExerciseHistoryPoint {
  sessionId: string
  planId: string
  planName: string
  date: IsoDate
  stars: Stars
  note?: string
}

/** Every rating a dog got for an exercise, across all its plans, oldest first. */
export async function getExerciseHistory(
  dogId: string,
  exerciseId: string,
): Promise<ExerciseHistoryPoint[]> {
  const results = await db.sessionResults.where('exerciseId').equals(exerciseId).toArray()
  const sessions = await db.sessions.bulkGet(results.map((r) => r.sessionId))
  const planIds = [...new Set(sessions.flatMap((s) => (s ? [s.planId] : [])))]
  const plans = new Map((await db.plans.bulkGet(planIds)).flatMap((p) => (p ? [[p.id, p]] : [])))

  return results
    .flatMap((r, i) => {
      const session = sessions[i]
      if (!session || session.dogId !== dogId) return []
      return [
        {
          sessionId: session.id,
          planId: session.planId,
          planName: plans.get(session.planId)?.name ?? '',
          date: session.date,
          stars: r.stars,
          ...(r.note ? { note: r.note } : {}),
        },
      ]
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.sessionId.localeCompare(b.sessionId))
}
