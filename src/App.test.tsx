import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createDog } from './db/dogs'
import { createExercise } from './db/exercises'

const renderAt = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('App', () => {
  it('renders the tab bar in Spanish', async () => {
    renderAt('/')
    for (const label of ['Perros', 'Ejercicios', 'Progreso', 'Ajustes']) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
    }
  })

  it('lists the dogs and shows a dog’s profile', async () => {
    const luna = await createDog({ name: 'Luna', breed: 'Border collie', birthDate: '2024-05-02' })
    await createDog({ name: 'Toby' })

    const { unmount } = renderAt('/dogs')
    expect(await screen.findByText('Toby')).toBeInTheDocument()
    expect(screen.getByText('Border collie')).toBeInTheDocument()
    unmount()

    renderAt(`/dogs/${luna.id}`)
    expect(await screen.findByText('Nació el 2 de mayo de 2024')).toBeInTheDocument()
  })

  it('shows an exercise with its links', async () => {
    const exercise = await createExercise({
      title: 'Sentado',
      description: 'Subir la mano con el premio',
      links: [{ url: 'https://example.com/sentado', label: 'Vídeo explicativo' }],
      media: [],
    })
    renderAt(`/exercises/${exercise.id}`)
    expect(await screen.findByText('Subir la mano con el premio')).toBeInTheDocument()
    expect(screen.getByText('Vídeo explicativo')).toBeInTheDocument()
  })

  it('shows "not found" for an unknown dog', async () => {
    renderAt('/dogs/00000000-0000-0000-0000-000000000000')
    expect(await screen.findByText('No se ha encontrado.')).toBeInTheDocument()
  })
})
