import { createDog } from '../db/dogs'
import { createExercise } from '../db/exercises'

export const makeDog = (name = 'Luna') => createDog({ name })

export const makeExercise = (title = 'Sentado') =>
  createExercise({ title, description: `Descripción de ${title}`, links: [], media: [] })

export const imageFile = (name = 'foto.jpg') =>
  new File(['fake-image-bytes'], name, { type: 'image/jpeg' })
