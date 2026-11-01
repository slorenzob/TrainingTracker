import { describe, expect, it } from 'vitest'
import type { Dog, Reminder, Weekday } from '../../db/types'
import { buildIcs, dueToday } from './reminderLogic'

const dog = (id: string, name: string) => ({ id, name, createdAt: '' }) as Dog
const luna = dog('luna', 'Luna')
const toby = dog('toby', 'Toby')

const reminder = (weekdays: Weekday[], extra: Partial<Reminder> = {}): Reminder => ({
  id: 'r1',
  weekdays,
  time: '18:30',
  enabled: true,
  ...extra,
})

// Sunday 1 November 2026, 10:00 local time.
const sunday = new Date(2026, 10, 1, 10, 0)

describe('dueToday', () => {
  it('returns nothing when no enabled reminder falls on today', () => {
    expect(dueToday([reminder([1, 3])], [luna], new Set(), sunday)).toBeNull()
    expect(dueToday([reminder([0], { enabled: false })], [luna], new Set(), sunday)).toBeNull()
  })

  it('applies a reminder without dog to every dog, sorted by name', () => {
    const due = dueToday([reminder([0])], [toby, luna], new Set(), sunday)
    expect(due?.dogs.map((d) => d.name)).toEqual(['Luna', 'Toby'])
    expect(due?.time).toBe('18:30')
  })

  it('leaves out dogs that already trained today and uses the earliest time', () => {
    const due = dueToday(
      [
        reminder([0], { dogId: 'luna', time: '19:00' }),
        reminder([0, 6], { dogId: 'toby', time: '08:15' }),
      ],
      [luna, toby],
      new Set(['toby']),
      sunday,
    )
    expect(due?.dogs.map((d) => d.name)).toEqual(['Luna'])
    expect(due?.time).toBe('08:15')
  })

  it('returns nothing once every reminded dog has trained', () => {
    expect(dueToday([reminder([0])], [luna], new Set(['luna']), sunday)).toBeNull()
  })
})

describe('buildIcs', () => {
  const lines = (ics: string) => ics.split('\r\n')

  it('builds a weekly event with an alarm, starting on the next matching day', () => {
    const ics = buildIcs(reminder([3, 5]), 'Entrenar con Luna', 'Recordatorio', sunday)
    expect(ics.endsWith('\r\n')).toBe(true)
    expect(lines(ics)).toEqual(
      expect.arrayContaining([
        'BEGIN:VCALENDAR',
        'UID:r1@training-tracker',
        // Next Wednesday after Sunday 1 Nov is 4 Nov.
        'DTSTART:20261104T183000',
        'DTEND:20261104T190000',
        'RRULE:FREQ=WEEKLY;BYDAY=WE,FR',
        'SUMMARY:Entrenar con Luna',
        'TRIGGER:PT0M',
        'END:VCALENDAR',
      ]),
    )
  })

  it('starts today when today matches, and escapes special characters', () => {
    const ics = buildIcs(reminder([0]), 'Luna, Toby; y más', 'línea 1\nlínea 2', sunday)
    expect(lines(ics)).toContain('DTSTART:20261101T183000')
    expect(lines(ics)).toContain('SUMMARY:Luna\\, Toby\\; y más')
    expect(lines(ics)).toContain('DESCRIPTION:línea 1\\nlínea 2')
  })

  it('caps the event end at midnight', () => {
    const ics = buildIcs(reminder([0], { time: '23:50' }), 'x', 'y', sunday)
    expect(lines(ics)).toContain('DTEND:20261101T235900')
  })
})
