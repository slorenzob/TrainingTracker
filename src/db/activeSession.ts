import { EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import { createSession, type SessionWithResults } from './sessions'
import type { ActiveSession, Plan, RatingDraft, Session } from './types'
import { nowIso, todayIso } from './utils'

const ID = 'current' as const

export const getActiveSession = (): Promise<ActiveSession | undefined> => db.activeSessions.get(ID)

/** Milliseconds trained so far, counting the current run of the timer. */
export function elapsedMs(
  active: Pick<ActiveSession, 'elapsedMs' | 'runningSince'>,
  now = new Date(),
) {
  const running = active.runningSince ? now.getTime() - Date.parse(active.runningSince) : 0
  return active.elapsedMs + Math.max(0, running)
}

/** Starts a session for the dog with the plan, timer running. Fails if one is in progress. */
export async function startActiveSession(dogId: string, planId: string): Promise<ActiveSession> {
  return db.transaction('rw', [db.activeSessions, db.plans], async () => {
    if (await db.activeSessions.get(ID))
      throw new ValidationError('A session is already in progress')
    const plan = await db.plans.get(planId)
    if (!plan) throw new EntityNotFoundError('Plan', planId)
    if (plan.dogId !== dogId) throw new ValidationError('The plan belongs to another dog')
    const now = nowIso()
    const active: ActiveSession = {
      id: ID,
      dogId,
      planId,
      date: todayIso(),
      startedAt: now,
      elapsedMs: 0,
      runningSince: now,
      ratings: {},
      comment: '',
    }
    await db.activeSessions.add(active)
    return active
  })
}

async function requireActive(): Promise<ActiveSession> {
  const active = await db.activeSessions.get(ID)
  if (!active) throw new EntityNotFoundError('ActiveSession', ID)
  return active
}

export async function setActiveRating(planExerciseId: string, changes: Partial<RatingDraft>) {
  await db.transaction('rw', [db.activeSessions], async () => {
    const active = await requireActive()
    const current = active.ratings[planExerciseId] ?? { note: '' }
    await db.activeSessions.update(ID, {
      ratings: { ...active.ratings, [planExerciseId]: { ...current, ...changes } },
    })
  })
}

export async function setActiveComment(comment: string) {
  await db.activeSessions.update(ID, { comment })
}

export async function pauseActiveSession(now = new Date()) {
  await db.transaction('rw', [db.activeSessions], async () => {
    const active = await requireActive()
    if (!active.runningSince) return
    await db.activeSessions.put({
      ...active,
      elapsedMs: elapsedMs(active, now),
      runningSince: undefined,
    })
  })
}

export async function resumeActiveSession(now = new Date()) {
  await db.transaction('rw', [db.activeSessions], async () => {
    const active = await requireActive()
    if (active.runningSince) return
    await db.activeSessions.update(ID, { runningSince: now.toISOString() })
  })
}

export const discardActiveSession = (): Promise<void> => db.activeSessions.delete(ID)

/**
 * Saves the session (rated exercises only, with the timed duration) and clears the draft.
 * Validation errors from the session repository (e.g. nothing rated) leave the draft intact.
 */
export async function finishActiveSession(now = new Date()): Promise<SessionWithResults> {
  return db.transaction(
    'rw',
    [db.activeSessions, db.plans, db.planExercises, db.sessions, db.sessionResults],
    async () => {
      const active = await requireActive()
      const results = Object.entries(active.ratings).flatMap(([planExerciseId, r]) =>
        r.stars === undefined ? [] : [{ planExerciseId, stars: r.stars, note: r.note }],
      )
      if (results.length === 0) throw new ValidationError('Rate at least one exercise')
      const session = await createSession(active.planId, {
        date: active.date,
        comment: active.comment,
        results,
        durationSeconds: elapsedMs(active, now) / 1000,
      })
      await db.activeSessions.delete(ID)
      return session
    },
  )
}

/**
 * Plan preselected when starting a session: the active plan of the dog's most recent
 * session, or else its newest active plan.
 */
export function pickDefaultPlan(
  activePlans: readonly Plan[],
  dogSessions: readonly Pick<Session, 'planId' | 'date' | 'createdAt'>[],
): Plan | undefined {
  const activeIds = new Set(activePlans.map((p) => p.id))
  const lastUsed = [...dogSessions]
    .filter((s) => activeIds.has(s.planId))
    .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt.localeCompare(a.createdAt))[0]
  if (lastUsed) return activePlans.find((p) => p.id === lastUsed.planId)
  return [...activePlans].sort((a, b) => b.startDate.localeCompare(a.startDate))[0]
}

/** Active plans of a dog (newest first) and the one to preselect. */
export async function getPlanChoices(dogId: string) {
  const [plans, sessions] = await Promise.all([
    db.plans.where('dogId').equals(dogId).toArray(),
    db.sessions.where('dogId').equals(dogId).toArray(),
  ])
  const active = plans
    .filter((p) => p.status === 'active')
    .sort((a, b) => b.startDate.localeCompare(a.startDate))
  return { plans: active, defaultPlanId: pickDefaultPlan(active, sessions)?.id }
}
