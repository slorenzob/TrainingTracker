import { strFromU8, unzipSync } from 'fflate'
import { db } from '../db/schema'
import type { MediaRef, Reminder } from '../db/types'
import { deleteOrphanMedia, getMediaStore } from '../media/mediaStore'
import { BACKUP_VERSION, backupSchema, DATA_FILE, type Backup } from './schema'

export type BackupErrorCode = 'notZip' | 'missingData' | 'invalidData' | 'newerVersion'

export class BackupError extends Error {
  readonly code: BackupErrorCode

  constructor(code: BackupErrorCode) {
    super(`Invalid backup: ${code}`)
    this.code = code
    this.name = 'BackupError'
  }
}

export interface ParsedBackup {
  backup: Backup
  /** Media files found in the archive, by path. */
  files: Map<string, Uint8Array>
  counts: { dogs: number; exercises: number; plans: number; sessions: number; media: number }
}

const referencedMedia = (backup: Backup): MediaRef[] => [
  ...backup.data.dogs.flatMap((d) => (d.photo ? [d.photo] : [])),
  ...backup.data.exercises.flatMap((e) => e.media),
]

/** Every id a record points to must exist in the backup, or the restored data would break. */
function referencesAreConsistent({ data }: Backup): boolean {
  const ids = (rows: { id: string }[]) => new Set(rows.map((r) => r.id))
  const dogs = ids(data.dogs)
  const exercises = ids(data.exercises)
  const plans = ids(data.plans)
  const planExercises = ids(data.planExercises)
  const sessions = ids(data.sessions)
  return (
    data.plans.every((p) => dogs.has(p.dogId)) &&
    data.planExercises.every((pe) => plans.has(pe.planId) && exercises.has(pe.exerciseId)) &&
    data.sessions.every((s) => plans.has(s.planId) && dogs.has(s.dogId)) &&
    data.sessionResults.every(
      (r) =>
        sessions.has(r.sessionId) &&
        planExercises.has(r.planExerciseId) &&
        exercises.has(r.exerciseId),
    ) &&
    data.reminders.every((r) => !r.dogId || dogs.has(r.dogId))
  )
}

/** Reads and validates a backup file without touching the current data. */
export async function readBackup(file: Blob): Promise<ParsedBackup> {
  let entries: Record<string, Uint8Array>
  try {
    entries = unzipSync(new Uint8Array(await file.arrayBuffer()))
  } catch {
    throw new BackupError('notZip')
  }
  const raw = entries[DATA_FILE]
  if (!raw) throw new BackupError('missingData')

  let json: unknown
  try {
    json = JSON.parse(strFromU8(raw))
  } catch {
    throw new BackupError('invalidData')
  }
  const version = (json as { version?: unknown })?.version
  const parsed = backupSchema.safeParse(json)
  if (!parsed.success) {
    throw new BackupError(
      typeof version === 'number' && version > BACKUP_VERSION ? 'newerVersion' : 'invalidData',
    )
  }

  const backup = parsed.data
  if (!referencesAreConsistent(backup)) throw new BackupError('invalidData')
  const files = new Map<string, Uint8Array>()
  for (const ref of referencedMedia(backup)) {
    const bytes = entries[ref.path]
    if (bytes) files.set(ref.path, bytes)
  }
  const { dogs, exercises, plans, sessions } = backup.data
  return {
    backup,
    files,
    counts: {
      dogs: dogs.length,
      exercises: exercises.length,
      plans: plans.length,
      sessions: sessions.length,
      media: files.size,
    },
  }
}

/**
 * Replaces all current data with the backup. Media files are written first (their paths
 * are unique ids, so they don't clash with current ones); the database is swapped in a
 * single transaction; finally files no longer referenced are removed.
 */
export async function restoreBackup({ backup, files }: ParsedBackup): Promise<void> {
  const mime = new Map(referencedMedia(backup).map((m) => [m.path, m.mime]))
  for (const [path, bytes] of files) {
    await getMediaStore().write(path, new Blob([bytes as BlobPart], { type: mime.get(path) }))
  }

  const { data } = backup
  try {
    await replaceAllData(data)
  } finally {
    // On success removes the previous data's files; on failure the ones just written.
    await deleteOrphanMedia()
  }
}

async function replaceAllData(data: Backup['data']) {
  await db.transaction('rw', db.tables, async () => {
    await Promise.all(db.tables.map((table) => table.clear()))
    await db.dogs.bulkAdd(data.dogs)
    await db.exercises.bulkAdd(data.exercises)
    await db.plans.bulkAdd(data.plans)
    await db.planExercises.bulkAdd(data.planExercises)
    await db.sessions.bulkAdd(data.sessions)
    await db.sessionResults.bulkAdd(data.sessionResults)
    await db.reminders.bulkAdd(data.reminders as Reminder[])
  })
}
