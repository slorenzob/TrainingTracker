import { strToU8, Zip, ZipDeflate, ZipPassThrough } from 'fflate'
import { db } from '../db/schema'
import { nowIso, todayIso } from '../db/utils'
import { getMediaStore, listReferencedMedia } from '../media/mediaStore'
import { BACKUP_FORMAT, BACKUP_VERSION, DATA_FILE, type Backup } from './schema'

export interface ExportResult {
  blob: Blob
  fileName: string
  /** Media referenced by the data whose file could not be read (already lost). */
  missingMedia: number
}

export async function collectBackupData(): Promise<Backup> {
  const data = await db.transaction('r', db.tables, async () => ({
    dogs: await db.dogs.toArray(),
    exercises: await db.exercises.toArray(),
    plans: await db.plans.toArray(),
    planExercises: await db.planExercises.toArray(),
    sessions: await db.sessions.toArray(),
    sessionResults: await db.sessionResults.toArray(),
    reminders: await db.reminders.toArray(),
  }))
  return { format: BACKUP_FORMAT, version: BACKUP_VERSION, exportedAt: nowIso(), data }
}

/** Streaming ZIP writer whose output stays as separate chunks until it becomes a Blob. */
function createZipWriter() {
  const chunks: Uint8Array[] = []
  let error: Error | null = null
  let finished!: () => void
  const done = new Promise<void>((resolve) => (finished = resolve))
  const zip = new Zip((err, chunk, final) => {
    if (err) error = err
    else chunks.push(chunk)
    if (final || err) finished()
  })
  return {
    /** Compressed entry (for JSON). */
    deflate(name: string, data: Uint8Array) {
      const entry = new ZipDeflate(name, { level: 6 })
      zip.add(entry)
      entry.push(data, true)
    },
    /** Stored entry, for photos and videos that are already compressed. */
    store(name: string, data: Uint8Array) {
      const entry = new ZipPassThrough(name)
      zip.add(entry)
      entry.push(data, true)
    },
    async finish(): Promise<Blob> {
      zip.end()
      await done
      if (error) throw error
      return new Blob(chunks as BlobPart[], { type: 'application/zip' })
    },
  }
}

/**
 * Builds a ZIP with `data.json` and every referenced media file under `media/`. Files are
 * read one at a time and the output is kept as chunks, so large videos are never
 * concatenated into a single in-memory buffer.
 */
export async function exportBackup(): Promise<ExportResult> {
  const backup = await collectBackupData()
  const zip = createZipWriter()
  zip.deflate(DATA_FILE, strToU8(JSON.stringify(backup)))

  let missingMedia = 0
  const paths = new Set((await listReferencedMedia()).map((m) => m.path))
  for (const path of paths) {
    try {
      const file = await getMediaStore().read(path)
      zip.store(path, new Uint8Array(await file.arrayBuffer()))
    } catch {
      missingMedia++
    }
  }

  return {
    blob: await zip.finish(),
    fileName: `training-tracker-${todayIso()}.zip`,
    missingMedia,
  }
}

/**
 * Offers the file through the share sheet where supported (lets the user save it to Files,
 * Drive, etc. on mobile), falling back to a regular download.
 */
export async function saveBackupFile({
  blob,
  fileName,
}: ExportResult): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: 'application/zip' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: fileName })
      return 'shared'
    } catch (e) {
      // Closing the share sheet is a choice, not an error; anything else falls back.
      if ((e as DOMException).name === 'AbortError') return 'cancelled'
    }
  }
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  link.click()
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
  return 'downloaded'
}
