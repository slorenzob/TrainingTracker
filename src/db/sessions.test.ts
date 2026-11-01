import { beforeEach, describe, expect, it } from 'vitest'
import { makeDog, makeExercise } from '../test/factories'
import { ValidationError } from './errors'
import { createPlan, getPlanExercises, type PlanExerciseWithDetails } from './plans'
import { db } from './schema'
import {
  createSession,
  deleteSession,
  getSession,
  listSessionSummaries,
  listSessionsForPlan,
  updateSession,
} from './sessions'
import type { Plan } from './types'

let plan: Plan
let sit: PlanExerciseWithDetails
let stay: PlanExerciseWithDetails

beforeEach(async () => {
  const dog = await makeDog()
  const a = await makeExercise('Sentado')
  const b = await makeExercise('Quieto')
  plan = await createPlan(dog.id, { name: 'P', startDate: '2026-10-01' }, [a.id, b.id])
  ;[sit, stay] = await getPlanExercises(plan.id)
})

describe('sessions', () => {
  it('stores only the practised exercises, with stars and notes', async () => {
    const session = await createSession(plan.id, {
      date: '2026-10-05',
      comment: ' Muy bien ',
      results: [{ planExerciseId: sit.id, stars: 4, note: ' Con distracciones ' }],
    })
    expect(session).toMatchObject({ dogId: plan.dogId, comment: 'Muy bien' })
    expect(session.results).toEqual([
      expect.objectContaining({
        planExerciseId: sit.id,
        exerciseId: sit.exerciseId,
        stars: 4,
        note: 'Con distracciones',
      }),
    ])
    expect(await getSession(session.id)).toEqual(session)
  })

  it.each([0, 6, 3.5])('rejects %s stars', async (stars) => {
    await expect(
      createSession(plan.id, {
        date: '2026-10-05',
        comment: '',
        results: [{ planExerciseId: sit.id, stars }],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    expect(await db.sessions.count()).toBe(0)
  })

  it('rejects exercises from another plan and duplicate ratings', async () => {
    const otherPlan = await createPlan(plan.dogId, { name: 'Otro', startDate: '2026-10-01' }, [
      sit.exerciseId,
    ])
    const [foreign] = await getPlanExercises(otherPlan.id)
    await expect(
      createSession(plan.id, {
        date: '2026-10-05',
        comment: '',
        results: [{ planExerciseId: foreign.id, stars: 3 }],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      createSession(plan.id, {
        date: '2026-10-05',
        comment: '',
        results: [
          { planExerciseId: sit.id, stars: 3 },
          { planExerciseId: sit.id, stars: 4 },
        ],
      }),
    ).rejects.toBeInstanceOf(ValidationError)
  })

  it('replaces results on update', async () => {
    const session = await createSession(plan.id, {
      date: '2026-10-05',
      comment: '',
      results: [{ planExerciseId: sit.id, stars: 2 }],
    })
    await updateSession(session.id, {
      date: '2026-10-06',
      comment: 'Corregido',
      results: [{ planExerciseId: stay.id, stars: 5 }],
    })
    const updated = await getSession(session.id)
    expect(updated).toMatchObject({ date: '2026-10-06', comment: 'Corregido' })
    expect(updated?.results.map((r) => [r.planExerciseId, r.stars])).toEqual([[stay.id, 5]])
  })

  it('lists a plan’s sessions newest first and deletes them', async () => {
    const make = (date: string) => createSession(plan.id, { date, comment: date, results: [] })
    await make('2026-10-03')
    const latest = await make('2026-10-09')
    await make('2026-10-01')
    expect((await listSessionsForPlan(plan.id)).map((s) => s.date)).toEqual([
      '2026-10-09',
      '2026-10-03',
      '2026-10-01',
    ])
    await deleteSession(latest.id)
    expect(await listSessionsForPlan(plan.id)).toHaveLength(2)
  })

  it('summarizes sessions with rated count and average stars', async () => {
    await createSession(plan.id, {
      date: '2026-10-05',
      comment: '',
      results: [
        { planExerciseId: sit.id, stars: 4 },
        { planExerciseId: stay.id, stars: 3 },
      ],
    })
    await createSession(plan.id, { date: '2026-10-07', comment: 'Sin puntuar', results: [] })

    const summaries = await listSessionSummaries(plan.id)

    expect(summaries.map((s) => [s.date, s.ratedCount, s.average])).toEqual([
      ['2026-10-07', 0, undefined],
      ['2026-10-05', 2, 3.5],
    ])
  })
})
