import type { Dog, Reminder, Weekday } from '../../db/types'

/** Monday-first, as calendars are shown in Spain. */
export const WEEK: readonly Weekday[] = [1, 2, 3, 4, 5, 6, 0]

const ICS_DAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'] as const

/**
 * Dogs that have a reminder today and no session recorded yet, mapped to the earliest
 * reminder time (`HH:mm`) that applies to each. A reminder without a dog applies to every dog.
 */
export function dueToday(
  reminders: readonly Reminder[],
  dogs: readonly Pick<Dog, 'id'>[],
  dogIdsTrainedToday: ReadonlySet<string>,
  now: Date,
): Map<string, string> {
  const today = now.getDay() as Weekday
  const due = new Map<string, string>()
  const matching = reminders
    .filter((r) => r.enabled && r.weekdays.includes(today))
    .sort((a, b) => a.time.localeCompare(b.time))
  for (const r of matching) {
    for (const dog of dogs) {
      if (r.dogId && r.dogId !== dog.id) continue
      if (dogIdsTrainedToday.has(dog.id) || due.has(dog.id)) continue
      due.set(dog.id, r.time)
    }
  }
  return due
}

const pad = (n: number) => String(n).padStart(2, '0')

/** iCalendar text must escape backslashes, commas, semicolons and newlines. */
const escapeText = (value: string) =>
  value.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n')

/** First date on or after `from` that falls on one of the weekdays. */
function firstOccurrence(weekdays: readonly Weekday[], from: Date): Date {
  const date = new Date(from.getFullYear(), from.getMonth(), from.getDate())
  while (!weekdays.includes(date.getDay() as Weekday)) date.setDate(date.getDate() + 1)
  return date
}

/**
 * A weekly recurring event (with an alert at start time) for the phone's calendar app,
 * which can notify even when the PWA is closed. Times are "floating": they follow the
 * device's local time zone.
 */
export function buildIcs(
  reminder: Pick<Reminder, 'id' | 'weekdays' | 'time'>,
  summary: string,
  description: string,
  now: Date,
): string {
  const [hours, minutes] = reminder.time.split(':').map(Number)
  const start = firstOccurrence(reminder.weekdays, now)
  const day = `${start.getFullYear()}${pad(start.getMonth() + 1)}${pad(start.getDate())}`
  const at = (h: number, m: number) => `${day}T${pad(h)}${pad(m)}00`
  const endMinutes = hours * 60 + minutes + 30
  const stamp = now
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '')

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Training Tracker//ES',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${reminder.id}@training-tracker`,
    `DTSTAMP:${stamp}`,
    `DTSTART:${at(hours, minutes)}`,
    // Capped at the end of the day so a late reminder doesn't spill into tomorrow.
    `DTEND:${endMinutes >= 24 * 60 ? at(23, 59) : at(Math.floor(endMinutes / 60), endMinutes % 60)}`,
    `RRULE:FREQ=WEEKLY;BYDAY=${reminder.weekdays.map((d) => ICS_DAYS[d]).join(',')}`,
    `SUMMARY:${escapeText(summary)}`,
    `DESCRIPTION:${escapeText(description)}`,
    'BEGIN:VALARM',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(summary)}`,
    'TRIGGER:PT0M',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
