import { describe, expect, it } from 'vitest'
import { formatBytes } from '../media/storage'
import { formatDate, formatDuration, formatTimer, normalizeForSearch, parseIsoDate } from './format'

describe('format helpers', () => {
  it('parses ISO dates as local calendar days', () => {
    const d = parseIsoDate('2026-01-31')
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 0, 31])
  })

  it('formats dates in Spanish', () => {
    expect(formatDate('2026-03-05')).toBe('5 de marzo de 2026')
  })

  it('normalizes accents and case for search', () => {
    expect(normalizeForSearch('Llamáda RÁPIDA')).toBe('llamada rapida')
  })

  it('formats byte sizes', () => {
    expect(formatBytes(0)).toBe('0 B')
    expect(formatBytes(1536)).toBe('1,5 KB')
    expect(formatBytes(150 * 1024 * 1024)).toBe('150 MB')
  })

  it('formats the running timer and saved durations', () => {
    expect(formatTimer(0)).toBe('0:00')
    expect(formatTimer(65_400)).toBe('1:05')
    expect(formatTimer(3_723_000)).toBe('1:02:03')
    expect(formatDuration(45)).toBe('45 s')
    expect(formatDuration(25 * 60)).toBe('25 min')
    expect(formatDuration(65 * 60)).toBe('1 h 05 min')
  })
})
