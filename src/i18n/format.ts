import type { IsoDate } from '../db/types'

const LOCALE = 'es-ES'

/** Parses `YYYY-MM-DD` as a local calendar date (not UTC midnight). */
export function parseIsoDate(value: IsoDate): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const formatDate = (value: IsoDate, style: 'long' | 'medium' = 'long'): string =>
  parseIsoDate(value).toLocaleDateString(LOCALE, { dateStyle: style })

/** Lowercases and strips accents so "Llamada" matches "llamáda" and vice versa. */
export const normalizeForSearch = (value: string): string =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()

/** Mean star rating with one decimal ("3,5"), or a dash when there is none. */
export const formatAverage = (value: number | undefined): string =>
  value === undefined ? '—' : value.toLocaleString(LOCALE, { maximumFractionDigits: 1 })

const pad2 = (n: number) => String(n).padStart(2, '0')

/** Running timer: "4:05", or "1:02:03" past the hour. */
export function formatTimer(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  return h > 0 ? `${h}:${pad2(m)}:${pad2(s)}` : `${m}:${pad2(s)}`
}

/** Saved duration: "45 s", "25 min", "1 h 05 min". */
export function formatDuration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)} s`
  const minutes = Math.round(seconds / 60)
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return h > 0 ? `${h} h ${pad2(m)} min` : `${m} min`
}
