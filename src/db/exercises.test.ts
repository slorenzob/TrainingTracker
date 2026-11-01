import { describe, expect, it } from 'vitest'
import { memoryMedia } from '../test/setup'
import { imageFile, makeDog, makeExercise } from '../test/factories'
import { saveMedia } from '../media/mediaStore'
import { ExerciseInUseError, ValidationError } from './errors'
import { createExercise, deleteExercise, listExercises, updateExercise } from './exercises'
import { createPlan } from './plans'

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
})
