import { deleteMedia } from '../media/mediaStore'
import { ExerciseInUseError, EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import type { Exercise, Plan } from './types'
import { newId, nowIso } from './utils'
import { isHttpUrl } from './validation'

export type ExerciseInput = Pick<Exercise, 'title' | 'description' | 'links' | 'media'>

function validate(input: Partial<ExerciseInput>) {
  if (input.title !== undefined && !input.title.trim()) {
    throw new ValidationError('Exercise title is required')
  }
  for (const link of input.links ?? []) {
    if (!isHttpUrl(link.url)) throw new ValidationError(`Invalid link: ${link.url}`)
  }
}

export async function createExercise(input: ExerciseInput): Promise<Exercise> {
  validate(input)
  const now = nowIso()
  const exercise: Exercise = {
    ...input,
    title: input.title.trim(),
    id: newId(),
    createdAt: now,
    updatedAt: now,
  }
  await db.exercises.add(exercise)
  return exercise
}

/** Updates the exercise and deletes media files that are no longer attached to it. */
export async function updateExercise(
  id: string,
  changes: Partial<ExerciseInput>,
): Promise<Exercise> {
  validate(changes)
  const current = await db.exercises.get(id)
  if (!current) throw new EntityNotFoundError('Exercise', id)
  const updated: Exercise = { ...current, ...changes, updatedAt: nowIso() }
  if (changes.title !== undefined) updated.title = changes.title.trim()
  await db.exercises.put(updated)
  const keptIds = new Set(updated.media.map((m) => m.id))
  await deleteMedia(current.media.filter((m) => !keptIds.has(m.id)))
  return updated
}

export const listExercises = (): Promise<Exercise[]> => db.exercises.orderBy('title').toArray()

export const getExercise = (id: string): Promise<Exercise | undefined> => db.exercises.get(id)

export async function isExerciseInUse(id: string): Promise<boolean> {
  return (await db.planExercises.where('exerciseId').equals(id).count()) > 0
}

export interface ExerciseUsage {
  plan: Plan
  dogName: string
  /** Only kept as a retired exercise because sessions of that plan rated it. */
  retired: boolean
}

/** Plans that reference the exercise, including those where it was retired but kept for its ratings. */
export async function getExerciseUsage(id: string): Promise<ExerciseUsage[]> {
  const rows = await db.planExercises.where('exerciseId').equals(id).toArray()
  const retiredByPlan = new Map<string, boolean>()
  for (const r of rows)
    retiredByPlan.set(r.planId, (retiredByPlan.get(r.planId) ?? true) && r.archived)
  const plans = (await db.plans.bulkGet([...retiredByPlan.keys()])).filter((p): p is Plan => !!p)
  const dogs = await db.dogs.bulkGet(plans.map((p) => p.dogId))
  return plans
    .map((plan, i) => ({
      plan,
      dogName: dogs[i]?.name ?? '',
      retired: retiredByPlan.get(plan.id)!,
    }))
    .sort((a, b) => a.dogName.localeCompare(b.dogName) || a.plan.name.localeCompare(b.plan.name))
}

/** Deletes an exercise from the library. Fails if any plan references it. */
export async function deleteExercise(id: string): Promise<void> {
  const exercise = await db.transaction('rw', [db.exercises, db.planExercises], async () => {
    const found = await db.exercises.get(id)
    if (!found) throw new EntityNotFoundError('Exercise', id)
    if (await isExerciseInUse(id)) throw new ExerciseInUseError(id)
    await db.exercises.delete(id)
    return found
  })
  await deleteMedia(exercise.media)
}
