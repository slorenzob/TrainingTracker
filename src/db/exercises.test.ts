import { describe, expect, it } from 'vitest'
import { memoryMedia } from '../test/setup'
import { imageFile, makeDog, makeExercise } from '../test/factories'
import { saveMedia } from '../media/mediaStore'
import { ExerciseInUseError, ValidationError } from './errors'
import {
  createExercise,
  deleteExercise,
  getExerciseUsage,
  listExercises,
  updateExercise,
} from './exercises'
import { createPlan, getPlanExercises, removeExerciseFromPlanByExercise } from './plans'
import { createSession } from './sessions'

describe('exercises', () => {
  it('creates exercises with links and media', async () => {
    const media = await saveMedia(imageFile())
    const exercise = await createExercise({
      title: 'Quieto',
      description: 'Mantener la posición',
      links: [{ url: 'https://youtu.be/abc', label: 'Vídeo' }],
      media: [media],
    })
    expect(await listExercises()).toEqual([exercise])
    expect(media.mime).toBe('image/jpeg')
    expect(media.path).toMatch(/^media\/.+\.jpg$/)
  })

  it('rejects links that are not http(s)', async () => {
    await expect(
      createExercise({
        title: 'X',
        description: '',
        links: [{ url: 'javascript:alert(1)' }],
        media: [],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('removes detached media files on update', async () => {
    const keep = await saveMedia(imageFile('keep.jpg'))
    const drop = await saveMedia(imageFile('drop.jpg'))
    const exercise = await createExercise({
      title: 'X',
      description: '',
      links: [],
      media: [keep, drop],
    })
    await updateExercise(exercise.id, { media: [keep] })
    expect([...memoryMedia.files.keys()]).toEqual([keep.path])
  })

  it('deletes an unused exercise together with its files', async () => {
    const media = await saveMedia(imageFile())
    const exercise = await createExercise({
      title: 'X',
      description: '',
      links: [],
      media: [media],
    })
    await deleteExercise(exercise.id)
    expect(await listExercises()).toEqual([])
    expect(memoryMedia.files.size).toBe(0)
  })

  it('refuses to delete an exercise used by a plan', async () => {
    const dog = await makeDog()
    const exercise = await makeExercise()
    await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [exercise.id])
    await expect(deleteExercise(exercise.id)).rejects.toBeInstanceOf(ExerciseInUseError)
  })

  it('removing from a plan keeps the exercise in the library and in other plans', async () => {
    const dog = await makeDog()
    const exercise = await makeExercise()
    const a = await createPlan(dog.id, { name: 'A', startDate: '2026-10-01' }, [exercise.id])
    const b = await createPlan(dog.id, { name: 'B', startDate: '2026-10-01' }, [exercise.id])

    expect(await removeExerciseFromPlanByExercise(a.id, exercise.id)).toBe('deleted')

    expect(await listExercises()).toEqual([exercise])
    expect(await getPlanExercises(a.id)).toEqual([])
    expect((await getPlanExercises(b.id)).map((pe) => pe.exerciseId)).toEqual([exercise.id])
    expect((await getExerciseUsage(exercise.id)).map((u) => u.plan.name)).toEqual(['B'])
    await expect(deleteExercise(exercise.id)).rejects.toBeInstanceOf(ExerciseInUseError)

    await removeExerciseFromPlanByExercise(b.id, exercise.id)
    expect(await getExerciseUsage(exercise.id)).toEqual([])
    await deleteExercise(exercise.id)
    expect(await listExercises()).toEqual([])
  })

  it('reports plans where the exercise is only kept as retired', async () => {
    const dog = await makeDog()
    const exercise = await makeExercise()
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [exercise.id])
    const [pe] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 4 }],
    })
    expect(await removeExerciseFromPlanByExercise(plan.id, exercise.id)).toBe('archived')
    const usage = await getExerciseUsage(exercise.id)
    expect(usage.map((u) => [u.plan.name, u.dogName, u.retired])).toEqual([['P', dog.name, true]])
  })
})
