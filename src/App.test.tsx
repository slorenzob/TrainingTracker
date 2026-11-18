import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'
import pkg from '../package.json'
import App from './App'
import { getActiveSession, startActiveSession } from './db/activeSession'
import { createDog } from './db/dogs'
import { createExercise } from './db/exercises'
import { createPlan, finishPlan, getPlanExercises, removeExerciseFromPlan } from './db/plans'
import { createReminder } from './db/reminders'
import { createSession } from './db/sessions'
import type { Weekday } from './db/types'
import { todayIso } from './db/utils'

const renderAt = (path: string) => {
  window.history.pushState({}, '', path)
  return render(<App />)
}

afterEach(() => window.history.pushState({}, '', '/'))

describe('App', () => {
  it('opens on the home tab and renders the tab bar in Spanish', async () => {
    renderAt('/')
    await waitFor(() => expect(window.location.pathname).toBe('/home'))
    for (const label of ['Inicio', 'Perros', 'Ejercicios', 'Progreso', 'Ajustes']) {
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
    // Recorded without a duration.
    expect(screen.getByText('Duración: --')).toBeInTheDocument()
  })
})

describe('progress', () => {
  // The exercise page lazy-loads the chart. Importing Recharts for the first time takes
  // seconds when the whole suite runs in parallel, which could outlast findBy's wait and
  // fail the test. Load it up front, with its own time budget; lazy() then resolves at once.
  beforeAll(() => import('./features/stats/StarsChart'), 30_000)

  it('summarizes the selected plan and shows an exercise’s history', async () => {
    const dog = await createDog({ name: 'Toby' })
    const ids = []
    for (const title of ['Llamada', 'Quieto']) {
      ids.push((await createExercise({ title, description: '', links: [], media: [] })).id)
    }
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, ids)
    const [llamada] = await getPlanExercises(plan.id)
    for (const [date, stars] of [
      ['2026-10-03', 2],
      ['2026-10-10', 4],
    ] as const) {
      await createSession(plan.id, {
        date,
        comment: '',
        results: [{ planExerciseId: llamada.id, stars }],
      })
    }

    const { unmount } = renderAt(`/progress?plan=${plan.id}`)
    expect(await screen.findByText('2 veces · media 3')).toBeInTheDocument()
    expect(screen.getByText('Menos practicados')).toBeInTheDocument()
    expect(screen.getAllByText('Sin practicar').length).toBeGreaterThan(0)
    unmount()

    renderAt(`/progress/dogs/${dog.id}/exercises/${ids[0]}`)
    expect(await screen.findByText('Historial')).toBeInTheDocument()
    expect(
      await screen.findByRole('img', { name: /Evolución de las estrellas de Llamada con Toby/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('img', { name: '10 oct 2026: 4 estrellas' })).toBeInTheDocument()
  })
})

describe('home', () => {
  const setUp = async () => {
    const dog = await createDog({ name: 'Toby' })
    const exercise = await createExercise({
      title: 'Llamada',
      description: '',
      links: [],
      media: [],
    })
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      exercise.id,
    ])
    return { dog, plan }
  }

  it('shows a card per dog with today’s notice until it is closed or a session is recorded', async () => {
    const user = userEvent.setup()
    const { dog, plan } = await setUp()
    const today = new Date().getDay() as Weekday
    await createReminder({ dogId: dog.id, weekdays: [today], time: '18:00', enabled: true })

    const { unmount } = renderAt('/home')
    expect(await screen.findByText('Hoy toca entrenar · 18:00')).toBeInTheDocument()
    expect(screen.getByText('Básico · 0 sesiones')).toBeInTheDocument()
    expect(screen.getByText('Sin sesiones todavía')).toBeInTheDocument()
    expect(screen.getByText('Entrenar')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Ocultar aviso hasta mañana' }))
    expect(screen.queryByText('Hoy toca entrenar · 18:00')).not.toBeInTheDocument()
    unmount()
    localStorage.clear()

    const [pe] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: todayIso(),
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 4 }],
    })
    renderAt('/home')
    expect(await screen.findByText('Última sesión: hoy')).toBeInTheDocument()
    expect(screen.getByText('Básico · 1 sesión')).toBeInTheDocument()
    expect(screen.queryByText('Hoy toca entrenar · 18:00')).not.toBeInTheDocument()
    expect(await screen.findByText('1 sesión en las últimas 12 semanas')).toBeInTheDocument()
  })

  it('starts the only plan of a dog straight from its card', async () => {
    const user = userEvent.setup()
    const { dog, plan } = await setUp()
    renderAt('/home')
    await user.click(await screen.findByText('Entrenar'))
    await waitFor(async () =>
      expect(await getActiveSession()).toMatchObject({ dogId: dog.id, planId: plan.id }),
    )
  })

  it('offers to create a plan to a dog without active plans', async () => {
    await createDog({ name: 'Luna' })
    renderAt('/home')
    expect(await screen.findByText('Sin plan activo')).toBeInTheDocument()
    expect(screen.getByText('Crear plan')).toBeInTheDocument()
    expect(screen.queryByText('Entrenar')).not.toBeInTheDocument()
  })

  it('filters the activity calendar by dog', async () => {
    const user = userEvent.setup()
    const { plan } = await setUp()
    await createDog({ name: 'Luna' })
    const [pe] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: todayIso(),
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 4 }],
    })
    renderAt('/home')
    expect(await screen.findByText('1 sesión en las últimas 12 semanas')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Luna' }))
    expect(screen.getByText('0 sesiones en las últimas 12 semanas')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Luna' })).toHaveAttribute('aria-pressed', 'true')
  })
})

describe('starting a session from home', () => {
  it('skips the dog step with a single dog, preselects the plan and resumes after reload', async () => {
    const dog = await createDog({ name: 'Toby' })
    const exercise = await createExercise({
      title: 'Llamada',
      description: '',
      links: [],
      media: [],
    })
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      exercise.id,
    ])

    const { unmount } = renderAt('/home/start')
    expect(await screen.findByText('Plan para Toby')).toBeInTheDocument()
    expect(screen.queryByText(/^Paso/)).not.toBeInTheDocument()
    expect(screen.queryByText('¿Quién entrena hoy?')).not.toBeInTheDocument()
    unmount()

    await startActiveSession(dog.id, plan.id)
    renderAt('/home')
    expect(await screen.findByText('Continuar sesión')).toBeInTheDocument()
    expect(screen.getByText('Sesión en curso · Básico')).toBeInTheDocument()
    expect(screen.queryByText('Entrenar')).not.toBeInTheDocument()
  })

  it('asks for the dog first when there are several', async () => {
    await createDog({ name: 'Luna' })
    await createDog({ name: 'Toby' })
    renderAt('/home/start')
    expect(await screen.findByText('¿Quién entrena hoy?')).toBeInTheDocument()
    expect(screen.getByText('Paso 1 de 2')).toBeInTheDocument()
  })

  it('goes straight to the plan step for the dog picked on the home screen', async () => {
    await createDog({ name: 'Luna' })
    const toby = await createDog({ name: 'Toby' })
    renderAt(`/home/start?dog=${toby.id}`)
    expect(await screen.findByText('Plan para Toby')).toBeInTheDocument()
    expect(screen.getByText('Paso 2 de 2')).toBeInTheDocument()
  })

  it('shows the app version in settings', async () => {
    renderAt('/settings')
    expect(await screen.findByText('Versión')).toBeInTheDocument()
    expect(screen.getByTestId('app-version')).toHaveTextContent(pkg.version)
  })
})
