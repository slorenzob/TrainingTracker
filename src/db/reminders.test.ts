import { describe, expect, it } from 'vitest'
import { makeDog } from '../test/factories'
import { deleteDog } from './dogs'
import { EntityNotFoundError, ValidationError } from './errors'
import {
  createReminder,
  deleteReminder,
  listReminders,
  setReminderEnabled,
  updateReminder,
} from './reminders'

describe('reminders', () => {
  it('creates reminders with sorted, unique weekdays and lists them by time', async () => {
    const dog = await makeDog()
    await createReminder({ dogId: dog.id, weekdays: [5, 1, 5], time: '19:00', enabled: true })
    await createReminder({ weekdays: [0], time: '08:30', enabled: true })
    const reminders = await listReminders()
    expect(reminders.map((r) => [r.time, r.weekdays])).toEqual([
      ['08:30', [0]],
      ['19:00', [1, 5]],
    ])
  })

  it('validates days, time and dog', async () => {
    await expect(
      createReminder({ weekdays: [], time: '10:00', enabled: true }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      createReminder({ weekdays: [1], time: '25:00', enabled: true }),
    ).rejects.toBeInstanceOf(ValidationError)
    await expect(
      createReminder({ dogId: 'nope', weekdays: [1], time: '10:00', enabled: true }),
    ).rejects.toBeInstanceOf(EntityNotFoundError)
  })

  it('updates, toggles and deletes', async () => {
    const r = await createReminder({ weekdays: [1], time: '10:00', enabled: true })
    await updateReminder(r.id, { weekdays: [2, 4], time: '11:15', enabled: true })
    await setReminderEnabled(r.id, false)
    expect(await listReminders()).toEqual([
      { id: r.id, weekdays: [2, 4], time: '11:15', enabled: false },
    ])
    await deleteReminder(r.id)
    expect(await listReminders()).toEqual([])
  })

  it('is deleted together with its dog', async () => {
    const dog = await makeDog()
    await createReminder({ dogId: dog.id, weekdays: [1], time: '10:00', enabled: true })
    await deleteDog(dog.id)
    expect(await listReminders()).toEqual([])
  })
})
