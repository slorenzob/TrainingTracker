import { EntityNotFoundError, ValidationError } from './errors'
import { db } from './schema'
import type { Reminder, Weekday } from './types'
import { newId } from './utils'

export type ReminderInput = Pick<Reminder, 'dogId' | 'weekdays' | 'time' | 'enabled'>

function normalize(input: ReminderInput): ReminderInput {
  const weekdays = [...new Set(input.weekdays)].sort() as Weekday[]
  if (weekdays.length === 0) throw new ValidationError('Pick at least one weekday')
  if (weekdays.some((d) => !Number.isInteger(d) || d < 0 || d > 6)) {
    throw new ValidationError(`Invalid weekdays: ${weekdays.join(',')}`)
  }
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.time)) {
    throw new ValidationError(`Invalid time: ${input.time}`)
  }
  return { ...input, weekdays, dogId: input.dogId || undefined }
}

async function requireDog(dogId: string | undefined) {
  if (dogId && !(await db.dogs.get(dogId))) throw new EntityNotFoundError('Dog', dogId)
}

export async function createReminder(input: ReminderInput): Promise<Reminder> {
  const reminder: Reminder = { ...normalize(input), id: newId() }
  await requireDog(reminder.dogId)
  await db.reminders.add(reminder)
  return reminder
}

export async function updateReminder(id: string, input: ReminderInput): Promise<Reminder> {
  if (!(await db.reminders.get(id))) throw new EntityNotFoundError('Reminder', id)
  const reminder: Reminder = { ...normalize(input), id }
  await requireDog(reminder.dogId)
  await db.reminders.put(reminder)
  return reminder
}

export async function setReminderEnabled(id: string, enabled: boolean): Promise<void> {
  const updated = await db.reminders.update(id, { enabled })
  if (!updated && !(await db.reminders.get(id))) throw new EntityNotFoundError('Reminder', id)
}

export const deleteReminder = (id: string): Promise<void> => db.reminders.delete(id)

/** Sorted by time of day. */
export const listReminders = async (): Promise<Reminder[]> =>
  (await db.reminders.toArray()).sort((a, b) => a.time.localeCompare(b.time))
