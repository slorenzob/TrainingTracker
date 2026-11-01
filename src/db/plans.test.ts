import { beforeEach, describe, expect, it } from 'vitest'
import { makeDog, makeExercise } from '../test/factories'
import { EntityNotFoundError, ValidationError } from './errors'
import {
  addExerciseToPlan,
  addExercisesToPlan,
  createPlan,
  deletePlan,
  duplicatePlan,
  finishPlan,
  getPlanExercises,
  listPlansForDog,
  removeExerciseFromPlan,
  reorderPlanExercises,
  reopenPlan,
} from './plans'
import { db } from './schema'
import { createSession } from './sessions'
import type { Dog, Exercise } from './types'

let dog: Dog
let sit: Exercise
let stay: Exercise
let come: Exercise

const titles = async (planId: string, includeArchived = false) =>
  (await getPlanExercises(planId, { includeArchived })).map((pe) => pe.exercise.title)

beforeEach(async () => {
  dog = await makeDog()
  sit = await makeExercise('Sentado')
  stay = await makeExercise('Quieto')
  come = await makeExercise('Llamada')
})

describe('plans', () => {
  it('creates a plan with ordered exercises', async () => {
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      stay.id,
      sit.id,
    ])
    expect(plan.status).toBe('active')
    expect(await titles(plan.id)).toEqual(['Quieto', 'Sentado'])
  })

  it('validates the dog and the exercises', async () => {
    await expect(createPlan('nope', { name: 'P', startDate: '2026-10-01' })).rejects.toBeInstanceOf(
      EntityNotFoundError,
    )
    await expect(
      createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, ['nope']),
    ).rejects.toBeInstanceOf(EntityNotFoundError)
    expect(await db.plans.count()).toBe(0)
  })

  it('lists a dog’s plans newest first', async () => {
    await createPlan(dog.id, { name: 'Viejo', startDate: '2026-01-01' })
    await createPlan(dog.id, { name: 'Nuevo', startDate: '2026-09-01' })
    expect((await listPlansForDog(dog.id)).map((p) => p.name)).toEqual(['Nuevo', 'Viejo'])
  })

  it('appends exercises and does not duplicate them', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [sit.id])
    await addExerciseToPlan(plan.id, come.id)
    await addExerciseToPlan(plan.id, come.id)
    expect(await titles(plan.id)).toEqual(['Sentado', 'Llamada'])
  })

  it('appends several exercises in the given order, restoring archived ones', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [sit.id, stay.id])
    const [peSit] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: peSit.id, stars: 3 }],
    })
    await removeExerciseFromPlan(peSit.id)

    const rows = await addExercisesToPlan(plan.id, [come.id, stay.id, sit.id])

    expect(rows.map((r) => r.exerciseId)).toEqual([come.id, stay.id, sit.id])
    expect(rows[2].id).toBe(peSit.id)
    expect(await titles(plan.id)).toEqual(['Quieto', 'Llamada', 'Sentado'])
  })

  it('adds nothing if any exercise does not exist', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' })
    await expect(addExercisesToPlan(plan.id, [sit.id, 'nope'])).rejects.toBeInstanceOf(
      EntityNotFoundError,
    )
    expect(await titles(plan.id)).toEqual([])
  })

  it('deletes unrated exercises but archives rated ones, and can restore them', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [sit.id, stay.id])
    const [peSit, peStay] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: peSit.id, stars: 3 }],
    })

    expect(await removeExerciseFromPlan(peSit.id)).toBe('archived')
    expect(await removeExerciseFromPlan(peStay.id)).toBe('deleted')
    expect(await titles(plan.id)).toEqual([])
    expect(await titles(plan.id, true)).toEqual(['Sentado'])

    const restored = await addExerciseToPlan(plan.id, sit.id)
    expect(restored.id).toBe(peSit.id)
    expect(await titles(plan.id)).toEqual(['Sentado'])
  })

  it('reorders active exercises and rejects incomplete orderings', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [
      sit.id,
      stay.id,
      come.id,
    ])
    const [a, b, c] = await getPlanExercises(plan.id)
    await reorderPlanExercises(plan.id, [c.id, a.id, b.id])
    expect(await titles(plan.id)).toEqual(['Llamada', 'Sentado', 'Quieto'])
    await expect(reorderPlanExercises(plan.id, [a.id, b.id])).rejects.toBeInstanceOf(
      ValidationError,
    )
  })

  it('duplicates a plan to another dog without its sessions or archived exercises', async () => {
    const other = await makeDog('Toby')
    const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [
      sit.id,
      stay.id,
    ])
    const [peSit] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: peSit.id, stars: 5 }],
    })
    await removeExerciseFromPlan(peSit.id)

    const copy = await duplicatePlan(plan.id, { dogId: other.id, name: 'Básico II' })

    expect(copy).toMatchObject({ dogId: other.id, name: 'Básico II', sourcePlanId: plan.id })
    expect(await db.plans.get(copy.id)).toMatchObject({ sourcePlanId: plan.id })
    expect(await titles(copy.id, true)).toEqual(['Quieto'])
    expect(await db.sessions.where('planId').equals(copy.id).count()).toBe(0)
  })

  it('finishes and reopens a plan', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' })
    expect(await finishPlan(plan.id, '2026-10-31')).toMatchObject({
      status: 'finished',
      endDate: '2026-10-31',
    })
    const reopened = await reopenPlan(plan.id)
    expect(reopened.status).toBe('active')
    expect(reopened).not.toHaveProperty('endDate')
  })

  it('deletes a plan with its sessions', async () => {
    const plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [sit.id])
    const [pe] = await getPlanExercises(plan.id)
    await createSession(plan.id, {
      date: '2026-10-02',
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 2 }],
    })
    await deletePlan(plan.id)
    expect(await db.plans.count()).toBe(0)
    expect(await db.planExercises.count()).toBe(0)
    expect(await db.sessions.count()).toBe(0)
    expect(await db.sessionResults.count()).toBe(0)
    expect(await db.exercises.count()).toBe(3)
  })
})
