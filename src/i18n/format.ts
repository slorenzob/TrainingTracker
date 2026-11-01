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
