import { getActiveSession, pickDefaultPlan } from '../../db/activeSession'
import { listDogs } from '../../db/dogs'
import { listReminders } from '../../db/reminders'
import { db } from '../../db/schema'
import type { ActiveSession, Dog, IsoDate, Plan } from '../../db/types'
import { todayIso } from '../../db/utils'
import { dueToday } from '../reminders/reminderLogic'

export interface DogCardData {
  dog: Dog
  activePlans: Plan[]
  /** Plan shown on the card: the one a new session would preselect. */
  plan?: Plan
  planSessions: number
  /** The only active plan, when it has exercises: "Entrenar" starts it right away. */
  quickStartPlanId?: string
  lastSessionDate?: IsoDate
  /** Time of today's reminder while the dog has not trained yet, `HH:mm`. */
  dueAt?: string
}

export interface HomeData {
  today: IsoDate
  cards: DogCardData[]
  active?: { session: ActiveSession; planName: string }
}

async function loadCard(dog: Dog, dueAt: string | undefined): Promise<DogCardData> {
  const [plans, sessions] = await Promise.all([
    db.plans.where('dogId').equals(dog.id).toArray(),
    db.sessions.where('dogId').equals(dog.id).toArray(),
  ])
  const activePlans = plans.filter((p) => p.status === 'active')
  const plan = pickDefaultPlan(activePlans, sessions)
  let quickStartPlanId: string | undefined
  if (activePlans.length === 1) {
    const exercises = await db.planExercises
      .where('planId')
      .equals(activePlans[0].id)
      .filter((pe) => !pe.archived)
      .count()
    if (exercises > 0) quickStartPlanId = activePlans[0].id
  }
  return {
    dog,
    activePlans,
    plan,
    planSessions: plan ? sessions.filter((s) => s.planId === plan.id).length : 0,
    quickStartPlanId,
    lastSessionDate: sessions
      .map((s) => s.date)
      .sort()
      .at(-1),
    dueAt,
  }
}

/** Everything the home screen shows about the dogs, in one live query. */
export async function loadHome(now = new Date()): Promise<HomeData> {
  const today = todayIso()
  const [dogs, reminders, todaySessions, session] = await Promise.all([
    listDogs(),
    listReminders(),
    db.sessions.where('date').equals(today).toArray(),
    getActiveSession(),
  ])
  const due = dueToday(reminders, dogs, new Set(todaySessions.map((s) => s.dogId)), now)
  const cards = await Promise.all(dogs.map((dog) => loadCard(dog, due.get(dog.id))))
  const activePlan = session && (await db.plans.get(session.planId))
  return {
    today,
    cards,
    active: session && { session, planName: activePlan?.name ?? '' },
  }
}
