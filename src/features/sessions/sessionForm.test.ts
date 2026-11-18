import { describe, expect, it } from 'vitest'
import type { PlanExerciseWithDetails } from '../../db/plans'
import type { SessionResult } from '../../db/types'
import {
  durationToMinutesText,
  exercisesForForm,
  parseDurationMinutes,
  ratingsFromResults,
  toSessionInput,
} from './sessionForm'

const pe = (id: string, archived = false) =>
  ({ id, archived, exercise: { title: id } }) as PlanExerciseWithDetails

describe('session form helpers', () => {
  it('keeps only rated exercises and trims notes', () => {
    const input = toSessionInput('2026-11-01', 'Bien', {
      a: { stars: 4, note: '  Con distracciones ' },
      b: { stars: undefined, note: 'nota de un ejercicio no puntuado' },
      c: { stars: 2, note: '   ' },
    })
    expect(input).toEqual({
      date: '2026-11-01',
      comment: 'Bien',
      results: [
        { planExerciseId: 'a', stars: 4, note: 'Con distracciones' },
        { planExerciseId: 'c', stars: 2 },
      ],
    })
  })

  it('asks for at least one rating', () => {
    expect(toSessionInput('2026-11-01', '', { a: { note: 'x' } })).toEqual({
      error: 'needOneRating',
    })
  })

  it('restores ratings from saved results', () => {
    const results = [
      { planExerciseId: 'a', stars: 3 },
      { planExerciseId: 'b', stars: 5, note: 'Genial' },
    ] as SessionResult[]
    expect(ratingsFromResults(results)).toEqual({
      a: { stars: 3, note: '' },
      b: { stars: 5, note: 'Genial' },
    })
  })

  it('offers active exercises plus archived ones this session rated', () => {
    const rows = exercisesForForm([pe('a'), pe('old', true), pe('rated-old', true)], {
      'rated-old': { stars: 4, note: '' },
    })
    expect(rows.map((r) => r.id)).toEqual(['a', 'rated-old'])
  })

  it('parses the duration in whole minutes', () => {
    expect(parseDurationMinutes('')).toBeNull()
    expect(parseDurationMinutes('  ')).toBeNull()
    expect(parseDurationMinutes('25')).toBe(1500)
    expect(parseDurationMinutes(' 1440 ')).toBe(86_400)
    for (const bad of ['0', '1441', '2.5', '2,5', '-3', 'abc']) {
      expect(parseDurationMinutes(bad)).toEqual({ error: 'invalidDuration' })
    }
  })

  it('shows a stored duration as minutes, at least 1', () => {
    expect(durationToMinutesText(undefined)).toBe('')
    expect(durationToMinutesText(21)).toBe('1')
    expect(durationToMinutesText(1500)).toBe('25')
  })

  it('passes the duration through only when given', () => {
    const ratings = { a: { stars: 4, note: '' } }
    expect(toSessionInput('2026-11-01', '', ratings)).not.toHaveProperty('durationSeconds')
    expect(toSessionInput('2026-11-01', '', ratings, null)).toMatchObject({ durationSeconds: null })
    expect(toSessionInput('2026-11-01', '', ratings, 600)).toMatchObject({ durationSeconds: 600 })
  })
})
