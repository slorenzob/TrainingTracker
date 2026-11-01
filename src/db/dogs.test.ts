import { describe, expect, it } from 'vitest'
import { memoryMedia } from '../test/setup'
import { imageFile, makeDog, makeExercise } from '../test/factories'
import { saveMedia } from '../media/mediaStore'
import { createDog, deleteDog, listDogs, updateDog } from './dogs'
import { ValidationError } from './errors'
import { createPlan } from './plans'
import { db } from './schema'
import { createSession } from './sessions'

describe('dogs', () => {
  it('creates dogs and lists them by name', async () => {
    await createDog({ name: '  Toby ' })
    await createDog({ name: 'Luna' })
    expect((await listDogs()).map((d) => d.name)).toEqual(['Luna', 'Toby'])
  })

  it('rejects an empty name', async () => {
    await expect(createDog({ name: '  ' })).rejects.toBeInstanceOf(ValidationError)
  })

  it('deletes the old photo file when it is replaced', async () => {
    const first = await saveMedia(imageFile('a.jpg'))
    const second = await saveMedia(imageFile('b.jpg'))
    const dog = await createDog({ name: 'Luna', photo: first })
    await updateDog(dog.id, { photo: second })
    expect(memoryMedia.files.has(first.path)).toBe(false)
    expect(memoryMedia.files.has(second.path)).toBe(true)
  })

  it('cascades deletion to plans, sessions and ratings but keeps library exercises', async () => {
    const dog = await makeDog()
    const other = await makeDog('Toby')
    const exercise = await makeExercise()
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      exercise.id,
    ])
    const otherPlan = await createPlan(other.id, { name: 'Otro', startDate: '2026-10-01' }, [
      exercise.id,
    ])
    const [pe] = await db.planExercises.where('planId').equals(plan.id).toArray()
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 4 }],
    })

    await deleteDog(dog.id)

    expect(await db.plans.toArray()).toEqual([otherPlan])
    expect(await db.sessions.count()).toBe(0)
    expect(await db.sessionResults.count()).toBe(0)
    expect(await db.planExercises.where('planId').equals(plan.id).count()).toBe(0)
    expect(await db.exercises.get(exercise.id)).toBeDefined()
  })
})
