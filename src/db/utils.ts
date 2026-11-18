import type { IsoDate, IsoDateTime } from './types'

export const newId = (): string => crypto.randomUUID()

export const nowIso = (): IsoDateTime => new Date().toISOString()

/** A date in local time as `YYYY-MM-DD`. */
export const toIsoDate = (d: Date): IsoDate => {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** Today's date in local time as `YYYY-MM-DD`. */
export const todayIso = (): IsoDate => toIsoDate(new Date())
