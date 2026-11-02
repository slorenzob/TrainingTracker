/** Calendar date without time, `YYYY-MM-DD`. */
export type IsoDate = string
/** Full ISO-8601 timestamp. */
export type IsoDateTime = string

/** Reference to a file stored in the media store (OPFS). */
export interface MediaRef {
  id: string
  /** Path relative to the media store root, e.g. `media/<uuid>.jpg`. */
  path: string
  mime: string
  size: number
  originalName: string
}

export interface ExerciseLink {
  url: string
  label?: string
}

export interface Dog {
  id: string
  name: string
  breed?: string
  birthDate?: IsoDate
  photo?: MediaRef
  createdAt: IsoDateTime
}

/** Exercise in the shared library; plans reference it through PlanExercise. */
export interface Exercise {
  id: string
  title: string
  description: string
  links: ExerciseLink[]
  media: MediaRef[]
  createdAt: IsoDateTime
  updatedAt: IsoDateTime
}

export type PlanStatus = 'active' | 'finished'

export interface Plan {
  id: string
  dogId: string
  name: string
  startDate: IsoDate
  endDate?: IsoDate
  status: PlanStatus
  notes?: string
  /** Plan this one was duplicated from, if any. */
  sourcePlanId?: string
  createdAt: IsoDateTime
}

export interface PlanExercise {
  id: string
  planId: string
  exerciseId: string
  order: number
  /** Removed from the plan but kept because sessions already rated it. */
  archived: boolean
}

export interface Session {
  id: string
  planId: string
  dogId: string
  date: IsoDate
  comment: string
  /** Time trained, measured by the in-progress session timer; absent for sessions entered by hand. */
  durationSeconds?: number
  createdAt: IsoDateTime
}

/** Draft rating of one exercise while a session is being recorded. */
export interface RatingDraft {
  stars?: number
  note: string
}

/**
 * The session currently being trained, saved on every change so it survives the app being
 * closed. There is at most one; it becomes a Session when finished.
 */
export interface ActiveSession {
  id: 'current'
  dogId: string
  planId: string
  /** Day the session started; becomes the session date. */
  date: IsoDate
  startedAt: IsoDateTime
  /** Time accumulated in previous runs of the timer. */
  elapsedMs: number
  /** When the timer was last started; absent while paused. */
  runningSince?: IsoDateTime
  /** Keyed by PlanExercise id. */
  ratings: Record<string, RatingDraft>
  comment: string
}

export type Stars = 1 | 2 | 3 | 4 | 5

/** Rating of one exercise in one session; only exercises actually practised get a result. */
export interface SessionResult {
  id: string
  sessionId: string
  planExerciseId: string
  exerciseId: string
  stars: Stars
  note?: string
}

/** 0 = Sunday … 6 = Saturday, matching `Date#getDay`. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6

export interface Reminder {
  id: string
  dogId?: string
  weekdays: Weekday[]
  /** Local time, `HH:mm`. */
  time: string
  enabled: boolean
}
