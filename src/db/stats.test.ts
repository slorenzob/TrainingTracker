import { beforeEach, describe, expect, it } from 'vitest'
import { makeDog, makeExercise } from '../test/factories'
import { createPlan, duplicatePlan, getPlanExercises, removeExerciseFromPlan } from './plans'
import { createSession } from './sessions'
import { getExerciseHistory, getPlanSummary } from './stats'
import type { Dog, Exercise, Plan } from './types'

let dog: Dog
let sit: Exercise
let stay: Exercise
let come: Exercise
let plan: Plan

/** Records a session rating exercises by title. */
async function session(p: Plan, date: string, ratings: Record<string, number>, note?: string) {
  const byTitle = new Map((await getPlanExercises(p.id)).map((pe) => [pe.exercise.title, pe.id]))
  return createSession(p.id, {
    date,
    comment: '',
    results: Object.entries(ratings).map(([title, stars]) => ({
      planExerciseId: byTitle.get(title)!,
      stars,
      ...(note ? { note } : {}),
    })),
  })
}

beforeEach(async () => {
  dog = await makeDog()
  sit = await makeExercise('Sentado')
  stay = await makeExercise('Quieto')
  come = await makeExercise('Llamada')
  plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
    sit.id,
    stay.id,
    come.id,
  ])
})

describe('getPlanSummary', () => {
  it('is empty before any session', async () => {
    const summary = await getPlanSummary(plan.id)
    expect(summary).toMatchObject({
      sessionCount: 0,
      overallAverage: undefined,
      leastPracticed: [],
    })
    expect(summary.exercises.map((e) => e.timesPracticed)).toEqual([0, 0, 0])
  })

  it('aggregates sessions per exercise and finds the least practised', async () => {
    await session(plan, '2026-10-02', { Sentado: 2, Quieto: 3 })
    await session(plan, '2026-10-09', { Sentado: 4 })
    await session(plan, '2026-10-05', { Sentado: 3 })

    const summary = await getPlanSummary(plan.id)

    expect(summary.sessionCount).toBe(3)
    expect(summary.lastSessionDate).toBe('2026-10-09')
    expect(summary.overallAverage).toBe(3)
    const [sentado, quieto, llamada] = summary.exercises
    expect(sentado).toMatchObject({
      timesPracticed: 3,
      average: 3,
      lastStars: 4,
      lastDate: '2026-10-09',
    })
    expect(quieto).toMatchObject({ timesPracticed: 1, average: 3, lastStars: 3 })
    expect(llamada).toMatchObject({ timesPracticed: 0, average: undefined })
    expect(summary.leastPracticed.map((e) => e.exercise.title)).toEqual(['Llamada', 'Quieto'])
  })

  it('lists rated archived exercises last and leaves unrated archived ones out', async () => {
    await session(plan, '2026-10-02', { Sentado: 5 })
    const [peSit, peStay] = await getPlanExercises(plan.id)
    await removeExerciseFromPlan(peSit.id) // rated → archived
    await removeExerciseFromPlan(peStay.id) // unrated → deleted

    const summary = await getPlanSummary(plan.id)

    expect(summary.exercises.map((e) => [e.exercise.title, e.archived])).toEqual([
      ['Llamada', false],
      ['Sentado', true],
    ])
    expect(summary.leastPracticed).toEqual([])
  })
})

describe('getExerciseHistory', () => {
  it('follows an exercise across the dog’s plans, oldest first, ignoring other dogs', async () => {
    await session(plan, '2026-10-02', { Llamada: 2 })
    const next = await duplicatePlan(plan.id, { name: 'Avanzado', startDate: '2026-11-01' })
    await session(next, '2026-11-03', { Llamada: 4 }, 'Muy bien')
    await session(plan, '2026-10-20', { Llamada: 3 })
    const other = await makeDog('Toby')
    const otherPlan = await duplicatePlan(plan.id, { dogId: other.id })
    await session(otherPlan, '2026-10-10', { Llamada: 1 })

    const history = await getExerciseHistory(dog.id, come.id)

    expect(history.map((h) => [h.date, h.stars, h.planName])).toEqual([
      ['2026-10-02', 2, 'Básico'],
      ['2026-10-20', 3, 'Básico'],
      ['2026-11-03', 4, 'Avanzado'],
    ])
    expect(history[2].note).toBe('Muy bien')
  })
})
