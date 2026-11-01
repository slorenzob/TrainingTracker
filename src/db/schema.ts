import Dexie, { type EntityTable } from 'dexie'
import type { Dog, Exercise, Plan, PlanExercise, Reminder, Session, SessionResult } from './types'

export const DB_NAME = 'training-tracker'

export class TrainingDb extends Dexie {
  dogs!: EntityTable<Dog, 'id'>
  exercises!: EntityTable<Exercise, 'id'>
  plans!: EntityTable<Plan, 'id'>
  planExercises!: EntityTable<PlanExercise, 'id'>
  sessions!: EntityTable<Session, 'id'>
  sessionResults!: EntityTable<SessionResult, 'id'>
  reminders!: EntityTable<Reminder, 'id'>

  constructor(name = DB_NAME) {
    super(name)
    this.version(1).stores({
      dogs: 'id, name',
      exercises: 'id, title',
      plans: 'id, dogId, status',
      planExercises: 'id, planId, exerciseId',
      sessions: 'id, planId, dogId, date, [planId+date]',
      sessionResults: 'id, sessionId, planExerciseId, exerciseId',
      reminders: 'id, dogId',
    })
  }
}

export const db = new TrainingDb()
