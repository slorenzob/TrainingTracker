import { z } from 'zod'

/** Bumped when the backup layout changes; older versions must stay importable. */
export const BACKUP_VERSION = 1
export const BACKUP_FORMAT = 'training-tracker-backup'
export const DATA_FILE = 'data.json'

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
const isoDateTime = z.string().min(1)
const id = z.string().min(1)

const mediaRef = z.object({
  id,
  // Only paths inside the media folder: a backup must not write elsewhere in OPFS.
  path: z.string().regex(/^media\/[\w.-]+$/),
  mime: z.string(),
  size: z.number().nonnegative(),
  originalName: z.string(),
})

const dog = z.object({
  id,
  name: z.string().min(1),
  breed: z.string().optional(),
  birthDate: isoDate.optional(),
  photo: mediaRef.optional(),
  createdAt: isoDateTime,
})

const exercise = z.object({
  id,
  title: z.string().min(1),
  description: z.string(),
  links: z.array(z.object({ url: z.url({ protocol: /^https?$/ }), label: z.string().optional() })),
  media: z.array(mediaRef),
  createdAt: isoDateTime,
  updatedAt: isoDateTime,
})

const plan = z.object({
  id,
  dogId: id,
  name: z.string().min(1),
  startDate: isoDate,
  endDate: isoDate.optional(),
  status: z.enum(['active', 'finished']),
  notes: z.string().optional(),
  sourcePlanId: id.optional(),
  createdAt: isoDateTime,
})

const planExercise = z.object({
  id,
  planId: id,
  exerciseId: id,
  order: z.number().int(),
  archived: z.boolean(),
})

const session = z.object({
  id,
  planId: id,
  dogId: id,
  date: isoDate,
  comment: z.string(),
  durationSeconds: z.number().int().nonnegative().optional(),
  createdAt: isoDateTime,
})

const sessionResult = z.object({
  id,
  sessionId: id,
  planExerciseId: id,
  exerciseId: id,
  stars: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5)]),
  note: z.string().optional(),
})

const reminder = z.object({
  id,
  dogId: id.optional(),
  weekdays: z.array(z.number().int().min(0).max(6)),
  time: z.string().regex(/^\d{2}:\d{2}$/),
  enabled: z.boolean(),
})

export const backupSchema = z.object({
  format: z.literal(BACKUP_FORMAT),
  version: z.number().int().min(1).max(BACKUP_VERSION),
  exportedAt: isoDateTime,
  data: z.object({
    dogs: z.array(dog),
    exercises: z.array(exercise),
    plans: z.array(plan),
    planExercises: z.array(planExercise),
    sessions: z.array(session),
    sessionResults: z.array(sessionResult),
    reminders: z.array(reminder),
  }),
})

export type Backup = z.infer<typeof backupSchema>
export type BackupData = Backup['data']
