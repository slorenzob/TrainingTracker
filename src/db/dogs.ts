import { deleteMedia } from '../media/mediaStore'
import { EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import type { Dog, MediaRef } from './types'
import { newId, nowIso } from './utils'

export type DogInput = Pick<Dog, 'name' | 'breed' | 'birthDate' | 'photo'>

function validate(input: Partial<DogInput>) {
  if (input.name !== undefined && !input.name.trim()) {
    throw new ValidationError('Dog name is required')
  }
}

export async function createDog(input: DogInput): Promise<Dog> {
  validate(input)
  const dog: Dog = { ...input, name: input.name.trim(), id: newId(), createdAt: nowIso() }
  await db.dogs.add(dog)
  return dog
}

export async function updateDog(id: string, changes: Partial<DogInput>): Promise<Dog> {
  validate(changes)
  const current = await db.dogs.get(id)
  if (!current) throw new EntityNotFoundError('Dog', id)
  const updated: Dog = { ...current, ...changes }
  if (changes.name !== undefined) updated.name = changes.name.trim()
  await db.dogs.put(updated)
  if (current.photo && current.photo.id !== updated.photo?.id) await deleteMedia([current.photo])
  return updated
}

export const listDogs = (): Promise<Dog[]> => db.dogs.orderBy('name').toArray()

export const getDog = (id: string): Promise<Dog | undefined> => db.dogs.get(id)

/** Deletes the dog with all its plans, sessions and ratings. */
export async function deleteDog(id: string): Promise<void> {
  let photo: MediaRef | undefined
  await db.transaction(
    'rw',
    [db.dogs, db.plans, db.planExercises, db.sessions, db.sessionResults, db.reminders],
    async () => {
      const dog = await db.dogs.get(id)
      if (!dog) throw new EntityNotFoundError('Dog', id)
      photo = dog.photo
      const planIds = await db.plans.where('dogId').equals(id).primaryKeys()
      const sessionIds = await db.sessions.where('dogId').equals(id).primaryKeys()
      await db.sessionResults.where('sessionId').anyOf(sessionIds).delete()
      await db.sessions.bulkDelete(sessionIds)
      await db.planExercises.where('planId').anyOf(planIds).delete()
      await db.plans.bulkDelete(planIds)
      await db.reminders.where('dogId').equals(id).delete()
      await db.dogs.delete(id)
    },
  )
  // File removal can't take part in the IndexedDB transaction, so it runs after commit.
  if (photo) await deleteMedia([photo])
}
