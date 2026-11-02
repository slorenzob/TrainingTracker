import { beforeEach, describe, expect, it } from 'vitest'
import { makeDog, makeExercise } from '../test/factories'
import {
  discardActiveSession,
  elapsedMs,
  finishActiveSession,
  getActiveSession,
  getPlanChoices,
  pauseActiveSession,
  pickDefaultPlan,
  resumeActiveSession,
  setActiveComment,
  setActiveRating,
  startActiveSession,
} from './activeSession'
import { deleteDog } from './dogs'
import { ValidationError } from './errors'
import { createPlan, deletePlan, finishPlan, getPlanExercises } from './plans'
import { db } from './schema'
import { createSession, getSession } from './sessions'
import type { Dog, Plan } from './types'

let dog: Dog
let plan: Plan

beforeEach(async () => {
  dog = await makeDog()
  const sit = await makeExercise('Sentado')
  plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [sit.id])
})

describe('active session', () => {
  it('starts with the timer running and refuses a second one', async () => {
    const active = await startActiveSession(dog.id, plan.id)
    expect(active).toMatchObject({ dogId: dog.id, planId: plan.id, elapsedMs: 0, comment: '' })
    expect(active.runningSince).toBeDefined()
    await expect(startActiveSession(dog.id, plan.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('rejects a plan of another dog', async () => {
    const other = await makeDog('Toby')
    await expect(startActiveSession(other.id, plan.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('accumulates time across pauses', async () => {
    await startActiveSession(dog.id, plan.id)
    const start = Date.parse((await getActiveSession())!.runningSince!)
    await pauseActiveSession(new Date(start + 30_000))
    const paused = (await getActiveSession())!
    expect(paused.runningSince).toBeUndefined()
    expect(elapsedMs(paused, new Date(start + 999_000))).toBe(30_000)

    await resumeActiveSession(new Date(start + 60_000))
    const resumed = (await getActiveSession())!
    expect(elapsedMs(resumed, new Date(start + 75_000))).toBe(45_000)
  })

  it('saves ratings and comment as they change, and finishes into a timed session', async () => {
    await startActiveSession(dog.id, plan.id)
    const [pe] = await getPlanExercises(plan.id)
    await setActiveRating(pe.id, { stars: 3 })
    await setActiveRating(pe.id, { note: 'Bien' })
    await setActiveComment('En el parque')
    const start = Date.parse((await getActiveSession())!.runningSince!)

    const session = await finishActiveSession(new Date(start + 1_500_000))

    expect(session).toMatchObject({ comment: 'En el parque', durationSeconds: 1500 })
    expect((await getSession(session.id))?.results).toEqual([
      expect.objectContaining({ planExerciseId: pe.id, stars: 3, note: 'Bien' }),
    ])
    expect(await getActiveSession()).toBeUndefined()
  })

  it('keeps the draft when nothing was rated', async () => {
    await startActiveSession(dog.id, plan.id)
    await expect(finishActiveSession()).rejects.toBeInstanceOf(ValidationError)
    expect(await getActiveSession()).toBeDefined()
    expect(await db.sessions.count()).toBe(0)
  })

  it('can be discarded', async () => {
    await startActiveSession(dog.id, plan.id)
    await discardActiveSession()
    expect(await getActiveSession()).toBeUndefined()
  })

  it('goes away with its plan or its dog', async () => {
    await startActiveSession(dog.id, plan.id)
    await deletePlan(plan.id)
    expect(await getActiveSession()).toBeUndefined()

    const other = await createPlan(dog.id, { name: 'Otro', startDate: '2026-10-01' })
    await startActiveSession(dog.id, other.id)
    await deleteDog(dog.id)
    expect(await getActiveSession()).toBeUndefined()
  })
})

describe('plan choices', () => {
  const p = (id: string, startDate: string) => ({ id, startDate }) as Plan

  it('prefers the plan of the most recent session, else the newest active plan', () => {
    const plans = [p('old', '2026-01-01'), p('new', '2026-09-01')]
    expect(pickDefaultPlan(plans, [])?.id).toBe('new')
    expect(
      pickDefaultPlan(plans, [
        { planId: 'new', date: '2026-10-01', createdAt: '1' },
        { planId: 'old', date: '2026-10-05', createdAt: '2' },
      ])?.id,
    ).toBe('old')
    // A session in a plan that is no longer active is ignored.
    expect(
      pickDefaultPlan(plans, [{ planId: 'finished', date: '2026-12-01', createdAt: '3' }])?.id,
    ).toBe('new')
  })

  it('offers only active plans, preselecting the last one used', async () => {
    const [pe] = await getPlanExercises(plan.id)
    const newer = await createPlan(dog.id, { name: 'Avanzado', startDate: '2026-10-20' })
    const finished = await createPlan(dog.id, { name: 'Viejo', startDate: '2026-01-01' })
    await finishPlan(finished.id)
    await createSession(plan.id, {
      date: '2026-10-25',
      comment: '',
      results: [{ planExerciseId: pe.id, stars: 4 }],
    })

    const choices = await getPlanChoices(dog.id)

    expect(choices.plans.map((x) => x.name)).toEqual(['Avanzado', 'Básico'])
    expect(choices.defaultPlanId).toBe(plan.id)
    expect(newer.status).toBe('active')
  })
})
