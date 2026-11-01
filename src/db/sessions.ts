import { EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import type { Session, SessionResult, Stars } from './types'
import { newId, nowIso } from './utils'

export interface SessionResultInput {
  planExerciseId: string
  stars: number
  note?: string
}

export interface SessionInput {
  date: string
  comment: string
  results: SessionResultInput[]
}

export interface SessionWithResults extends Session {
  results: SessionResult[]
}

const isStars = (n: number): n is Stars => Number.isInteger(n) && n >= 1 && n <= 5

/** Validates the results against the plan and resolves each one's exercise id. */
async function buildResults(
  planId: string,
  sessionId: string,
  inputs: readonly SessionResultInput[],
): Promise<SessionResult[]> {
  const planExercises = await db.planExercises.where('planId').equals(planId).toArray()
  const byId = new Map(planExercises.map((pe) => [pe.id, pe]))
  const seen = new Set<string>()
  return inputs.map((input) => {
    const pe = byId.get(input.planExerciseId)
    if (!pe)
      throw new ValidationError(`Exercise does not belong to the plan: ${input.planExerciseId}`)
    if (seen.has(pe.id)) throw new ValidationError(`Exercise rated twice: ${pe.id}`)
    seen.add(pe.id)
    if (!isStars(input.stars)) throw new ValidationError(`Stars must be 1–5, got ${input.stars}`)
    const note = input.note?.trim()
    return {
      id: newId(),
      sessionId,
      planExerciseId: pe.id,
      exerciseId: pe.exerciseId,
      stars: input.stars,
      ...(note ? { note } : {}),
    }
  })
}

const tables = () => [db.plans, db.planExercises, db.sessions, db.sessionResults]

export async function createSession(
  planId: string,
  input: SessionInput,
): Promise<SessionWithResults> {
  return db.transaction('rw', tables(), async () => {
    const plan = await db.plans.get(planId)
    if (!plan) throw new EntityNotFoundError('Plan', planId)
    const session: Session = {
      id: newId(),
      planId,
      dogId: plan.dogId,
      date: input.date,
      comment: input.comment.trim(),
      createdAt: nowIso(),
    }
    const results = await buildResults(planId, session.id, input.results)
    await db.sessions.add(session)
    await db.sessionResults.bulkAdd(results)
    return { ...session, results }
  })
}

/** Replaces the session's date, comment and full set of results. */
export async function updateSession(id: string, input: SessionInput): Promise<SessionWithResults> {
  return db.transaction('rw', tables(), async () => {
    const current = await db.sessions.get(id)
    if (!current) throw new EntityNotFoundError('Session', id)
    const session: Session = { ...current, date: input.date, comment: input.comment.trim() }
    const results = await buildResults(current.planId, id, input.results)
    await db.sessions.put(session)
    await db.sessionResults.where('sessionId').equals(id).delete()
    await db.sessionResults.bulkAdd(results)
    return { ...session, results }
  })
}

export async function getSession(id: string): Promise<SessionWithResults | undefined> {
  const session = await db.sessions.get(id)
  if (!session) return undefined
  const results = await db.sessionResults.where('sessionId').equals(id).toArray()
  return { ...session, results }
}

/** Sessions of a plan, newest first. */
export const listSessionsForPlan = async (planId: string): Promise<Session[]> =>
  (
    await db.sessions.where('[planId+date]').between([planId, ''], [planId, '￿']).toArray()
  ).reverse()

export async function deleteSession(id: string): Promise<void> {
  await db.transaction('rw', [db.sessions, db.sessionResults], async () => {
    if (!(await db.sessions.get(id))) throw new EntityNotFoundError('Session', id)
    await db.sessionResults.where('sessionId').equals(id).delete()
    await db.sessions.delete(id)
  })
}
