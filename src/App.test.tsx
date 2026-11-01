import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import App from './App'
import { createDog } from './db/dogs'
import { createExercise } from './db/exercises'
import { createPlan, finishPlan, getPlanExercises, removeExerciseFromPlan } from './db/plans'
import { createSession } from './db/sessions'

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

describe('plans', () => {
  it('lists a dog’s plans, active first, with their exercise count', async () => {
    const dog = await createDog({ name: 'Luna' })
    const exercise = await createExercise({
      title: 'Sentado',
      description: '',
      links: [],
      media: [],
    })
    const old = await createPlan(dog.id, { name: 'Plan viejo', startDate: '2026-12-01' })
    await finishPlan(old.id, '2026-12-31')
    await createPlan(dog.id, { name: 'Plan actual', startDate: '2026-01-01' }, [exercise.id])

    renderAt(`/dogs/${dog.id}`)
    const items = await screen.findAllByRole('heading', { level: 2 })
    expect(items.map((h) => h.textContent)).toEqual(['Plan actual', 'Plan viejo'])
    expect(screen.getByText('1 ejercicio')).toBeInTheDocument()
    expect(screen.getByText('Finalizado')).toBeInTheDocument()
  })

  it('shows active and archived exercises of a plan', async () => {
    const dog = await createDog({ name: 'Luna' })
    const sit = await createExercise({ title: 'Sentado', description: '', links: [], media: [] })
    const stay = await createExercise({ title: 'Quieto', description: '', links: [], media: [] })
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      sit.id,
      stay.id,
    ])
    const [peSit] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: peSit.id, stars: 4 }],
    })
    await removeExerciseFromPlan(peSit.id)

    renderAt(`/dogs/${dog.id}/plans/${plan.id}`)
    expect(await screen.findByText('Ejercicios retirados')).toBeInTheDocument()
    expect(screen.getByText('Quieto')).toBeInTheDocument()
    expect(screen.getByText('Sentado')).toBeInTheDocument()
    expect(screen.getByText('Restaurar')).toBeInTheDocument()
  })
})

describe('sessions', () => {
  it('shows a session with its ratings, notes and the exercises not done', async () => {
    const dog = await createDog({ name: 'Toby' })
    const ids = []
    for (const title of ['Llamada', 'Quieto', 'Sentado']) {
      ids.push((await createExercise({ title, description: '', links: [], media: [] })).id)
    }
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, ids)
    const [llamada, , sentado] = await getPlanExercises(plan.id)
    const session = await createSession(plan.id, {
      date: '2026-11-01',
      comment: 'Buena sesión en el parque',
      results: [
        { planExerciseId: llamada.id, stars: 4, note: 'Viene a la primera' },
        { planExerciseId: sentado.id, stars: 3 },
      ],
    })

    const { unmount } = renderAt(`/dogs/${dog.id}/plans/${plan.id}`)
    expect(await screen.findByText('2 de 3 ejercicios · Media 3,5')).toBeInTheDocument()
    unmount()

    renderAt(`/dogs/${dog.id}/plans/${plan.id}/sessions/${session.id}`)
    expect(await screen.findByText('Buena sesión en el parque')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: 'Llamada: 4 estrellas' })).toBeInTheDocument()
    expect(screen.getByText('Viene a la primera')).toBeInTheDocument()
    expect(screen.getByText('No realizado')).toBeInTheDocument()
  })
})
