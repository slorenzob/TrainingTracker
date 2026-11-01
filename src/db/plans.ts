import { EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import type { Exercise, Plan, PlanExercise } from './types'
import { newId, nowIso, todayIso } from './utils'

export type PlanInput = Pick<Plan, 'name' | 'startDate' | 'notes'>

export interface PlanExerciseWithDetails extends PlanExercise {
  exercise: Exercise
}

async function requirePlan(id: string): Promise<Plan> {
  const plan = await db.plans.get(id)
  if (!plan) throw new EntityNotFoundError('Plan', id)
  return plan
}

async function requireExercises(ids: readonly string[]) {
  const found = await db.exercises.bulkGet([...ids])
  const missing = ids.find((_, i) => !found[i])
  if (missing) throw new EntityNotFoundError('Exercise', missing)
}

export async function createPlan(
  dogId: string,
  input: PlanInput & Pick<Plan, 'sourcePlanId'>,
  exerciseIds: readonly string[] = [],
): Promise<Plan> {
  if (!input.name.trim()) throw new ValidationError('Plan name is required')
  return db.transaction('rw', [db.dogs, db.exercises, db.plans, db.planExercises], async () => {
    if (!(await db.dogs.get(dogId))) throw new EntityNotFoundError('Dog', dogId)
    await requireExercises(exerciseIds)
    const plan: Plan = {
      ...input,
      name: input.name.trim(),
      id: newId(),
      dogId,
      status: 'active',
      createdAt: nowIso(),
    }
    await db.plans.add(plan)
    await db.planExercises.bulkAdd(
      exerciseIds.map((exerciseId, order) => ({
        id: newId(),
        planId: plan.id,
        exerciseId,
        order,
        archived: false,
      })),
    )
    return plan
  })
}

export async function updatePlan(id: string, changes: Partial<PlanInput>): Promise<Plan> {
  if (changes.name !== undefined && !changes.name.trim()) {
    throw new ValidationError('Plan name is required')
  }
  const updated = { ...(await requirePlan(id)), ...changes }
  if (changes.name !== undefined) updated.name = changes.name.trim()
  await db.plans.put(updated)
  return updated
}

export const listPlansForDog = async (dogId: string): Promise<Plan[]> =>
  (await db.plans.where('dogId').equals(dogId).toArray()).sort((a, b) =>
    b.startDate.localeCompare(a.startDate),
  )

export const getPlan = (id: string): Promise<Plan | undefined> => db.plans.get(id)

/** Exercises of the plan in order, joined with their library entry. */
export async function getPlanExercises(
  planId: string,
  { includeArchived = false } = {},
): Promise<PlanExerciseWithDetails[]> {
  const rows = (await db.planExercises.where('planId').equals(planId).toArray())
    .filter((pe) => includeArchived || !pe.archived)
    .sort((a, b) => a.order - b.order)
  const exercises = await db.exercises.bulkGet(rows.map((r) => r.exerciseId))
  return rows.map((row, i) => ({ ...row, exercise: exercises[i]! }))
}

/** Adds an exercise at the end of the plan (or restores it if it had been archived). */
export async function addExerciseToPlan(planId: string, exerciseId: string): Promise<PlanExercise> {
  return db.transaction('rw', [db.plans, db.exercises, db.planExercises], async () => {
    await requirePlan(planId)
    await requireExercises([exerciseId])
    const rows = await db.planExercises.where('planId').equals(planId).toArray()
    const order = rows.reduce((max, r) => Math.max(max, r.order + 1), 0)
    const existing = rows.find((r) => r.exerciseId === exerciseId)
    if (existing) {
      if (!existing.archived) return existing
      const restored = { ...existing, archived: false, order }
      await db.planExercises.put(restored)
      return restored
    }
    const row: PlanExercise = { id: newId(), planId, exerciseId, order, archived: false }
    await db.planExercises.add(row)
    return row
  })
}

/**
 * Removes an exercise from the plan. If any session already rated it, it is archived
 * instead so the historical ratings keep pointing to a valid row.
 */
export async function removeExerciseFromPlan(
  planExerciseId: string,
): Promise<'deleted' | 'archived'> {
  return db.transaction('rw', [db.planExercises, db.sessionResults], async () => {
    const row = await db.planExercises.get(planExerciseId)
    if (!row) throw new EntityNotFoundError('PlanExercise', planExerciseId)
    const rated = await db.sessionResults.where('planExerciseId').equals(planExerciseId).count()
    if (rated > 0) {
      await db.planExercises.update(planExerciseId, { archived: true })
      return 'archived'
    }
    await db.planExercises.delete(planExerciseId)
    return 'deleted'
  })
}

/** Sets the order of the plan's active exercises to the given sequence of PlanExercise ids. */
export async function reorderPlanExercises(
  planId: string,
  orderedIds: readonly string[],
): Promise<void> {
  await db.transaction('rw', [db.planExercises], async () => {
    const active = (await db.planExercises.where('planId').equals(planId).toArray()).filter(
      (r) => !r.archived,
    )
    const activeIds = new Set(active.map((r) => r.id))
    if (orderedIds.length !== activeIds.size || !orderedIds.every((id) => activeIds.has(id))) {
      throw new ValidationError(
        'Reorder must include every active exercise of the plan exactly once',
      )
    }
    await Promise.all(orderedIds.map((id, order) => db.planExercises.update(id, { order })))
  })
}

/** Copies a plan (its active exercises, not its sessions) to the same dog or another one. */
export async function duplicatePlan(
  sourcePlanId: string,
  options: { dogId?: string; name?: string; startDate?: string } = {},
): Promise<Plan> {
  const source = await requirePlan(sourcePlanId)
  const exercises = await getPlanExercises(sourcePlanId)
  return createPlan(
    options.dogId ?? source.dogId,
    {
      name: options.name ?? source.name,
      startDate: options.startDate ?? todayIso(),
      notes: source.notes,
      sourcePlanId,
    },
    exercises.map((e) => e.exerciseId),
  )
}

export async function finishPlan(id: string, endDate: string = todayIso()): Promise<Plan> {
  const updated: Plan = { ...(await requirePlan(id)), status: 'finished', endDate }
  await db.plans.put(updated)
  return updated
}

export async function reopenPlan(id: string): Promise<Plan> {
  const updated: Plan = { ...(await requirePlan(id)), status: 'active' }
  delete updated.endDate
  await db.plans.put(updated)
  return updated
}

/** Deletes the plan with its sessions and ratings. Library exercises are kept. */
export async function deletePlan(id: string): Promise<void> {
  await db.transaction(
    'rw',
    [db.plans, db.planExercises, db.sessions, db.sessionResults],
    async () => {
      await requirePlan(id)
      const sessionIds = await db.sessions.where('planId').equals(id).primaryKeys()
      await db.sessionResults.where('sessionId').anyOf(sessionIds).delete()
      await db.sessions.bulkDelete(sessionIds)
      await db.planExercises.where('planId').equals(id).delete()
      await db.plans.delete(id)
    },
  )
}
