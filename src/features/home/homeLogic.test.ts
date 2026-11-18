import { describe, expect, it } from 'vitest'
import { activityDays, activityLevel, daysBetween } from './homeLogic'

describe('daysBetween', () => {
  it('counts calendar days, also across a daylight saving change', () => {
    expect(daysBetween('2026-11-18', '2026-11-18')).toBe(0)
    expect(daysBetween('2026-11-17', '2026-11-18')).toBe(1)
    expect(daysBetween('2026-10-24', '2026-10-26')).toBe(2)
  })
})

describe('activityDays', () => {
  it('starts on a Monday and ends with the current week', () => {
    // Wednesday 18 November 2026.
    const days = activityDays(new Date(2026, 10, 18, 10, 0), 2)
    expect(days).toHaveLength(14)
    expect(days[0]).toBe('2026-11-09')
    expect(days.at(-1)).toBe('2026-11-22')
    expect(days).toContain('2026-11-18')
  })

  it('counts a Sunday as the end of its week', () => {
    const days = activityDays(new Date(2026, 10, 22), 1)
    expect(days[0]).toBe('2026-11-16')
    expect(days.at(-1)).toBe('2026-11-22')
  })
})

describe('activityLevel', () => {
  it('groups days by sessions', () => {
    expect([0, 1, 2, 5].map(activityLevel)).toEqual([0, 1, 2, 2])
  })
})
