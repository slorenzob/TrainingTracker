import { strToU8, zipSync } from 'fflate'
import { describe, expect, it } from 'vitest'
import { createDog, listDogs } from '../db/dogs'
import { createExercise } from '../db/exercises'
import { createPlan, getPlanExercises } from '../db/plans'
import { db } from '../db/schema'
import { createSession } from '../db/sessions'
import { saveMedia } from '../media/mediaStore'
import { imageFile } from '../test/factories'
import { memoryMedia } from '../test/setup'
import { collectBackupData, exportBackup } from './export'
import { BackupError, readBackup, restoreBackup } from './import'
import { isBackupDue } from './lastBackup'
import { BACKUP_VERSION } from './schema'

async function seed() {
  const photo = await saveMedia(imageFile('luna.jpg'))
  const video = await saveMedia(new File(['fake-video'], 'sentado.webm', { type: 'video/webm' }))
  const dog = await createDog({ name: 'Luna', photo })
  const exercise = await createExercise({
    title: 'Sentado',
    description: 'Con premio',
    links: [{ url: 'https://example.com', label: 'Vídeo' }],
    media: [video],
  })
  const plan = await createPlan(dog.id, { name: 'Básico', startDate: '2026-10-01' }, [exercise.id])
  const [pe] = await getPlanExercises(plan.id)
  await createSession(plan.id, {
    date: '2026-10-02',
    comment: 'Bien',
    results: [{ planExerciseId: pe.id, stars: 4, note: 'Rápido' }],
  })
  return { photo, video }
}

const zipOf = (files: Record<string, string>) =>
  new Blob([zipSync(Object.fromEntries(Object.entries(files).map(([k, v]) => [k, strToU8(v)])))])

async function expectBackupError(file: Blob, code: string) {
  const error = await readBackup(file).catch((e: unknown) => e)
  expect(error).toBeInstanceOf(BackupError)
  expect((error as BackupError).code).toBe(code)
}

describe('backup', () => {
  it('round-trips all data and media files', async () => {
    const { photo, video } = await seed()
    const before = await collectBackupData()
    const { blob, missingMedia, fileName } = await exportBackup()
    expect(missingMedia).toBe(0)
    expect(fileName).toMatch(/^training-tracker-\d{4}-\d{2}-\d{2}\.zip$/)

    // Wipe everything, then restore.
    await Promise.all(db.tables.map((t) => t.clear()))
    memoryMedia.files.clear()
    const parsed = await readBackup(blob)
    expect(parsed.counts).toEqual({ dogs: 1, exercises: 1, plans: 1, sessions: 1, media: 2 })
    await restoreBackup(parsed)

    expect((await collectBackupData()).data).toEqual(before.data)
    expect(await (await memoryMedia.read(photo.path)).text()).toBe('fake-image-bytes')
    const restoredVideo = await memoryMedia.read(video.path)
    expect(restoredVideo.type).toBe('video/webm')
    expect(await restoredVideo.text()).toBe('fake-video')
  })

  it('replaces current data and removes files only the old data used', async () => {
    await seed()
    const { blob } = await exportBackup()
    const extraPhoto = await saveMedia(imageFile('otro.jpg'))
    await createDog({ name: 'Temporal', photo: extraPhoto })

    await restoreBackup(await readBackup(blob))

    expect((await listDogs()).map((d) => d.name)).toEqual(['Luna'])
    expect(memoryMedia.files.has(extraPhoto.path)).toBe(false)
    expect(memoryMedia.files.size).toBe(2)
  })

  it('exports even when a media file is already missing, and reports it', async () => {
    const { photo } = await seed()
    await memoryMedia.remove(photo.path)
    const { blob, missingMedia } = await exportBackup()
    expect(missingMedia).toBe(1)
    expect((await readBackup(blob)).counts.media).toBe(1)
  })

  it('rejects files that are not valid backups', async () => {
    await expectBackupError(new Blob(['not a zip']), 'notZip')
    await expectBackupError(zipOf({ 'otro.txt': 'hola' }), 'missingData')
    await expectBackupError(zipOf({ 'data.json': '{ roto' }), 'invalidData')
    await expectBackupError(zipOf({ 'data.json': '{"format":"otra-app"}' }), 'invalidData')
  })

  it('rejects backups from a newer app version', async () => {
    await seed()
    const backup = await collectBackupData()
    const newer = { ...backup, version: BACKUP_VERSION + 1 }
    await expectBackupError(zipOf({ 'data.json': JSON.stringify(newer) }), 'newerVersion')
  })

  it('rejects backups whose records point to missing ones', async () => {
    await seed()
    const backup = await collectBackupData()
    backup.data.dogs = []
    await expectBackupError(zipOf({ 'data.json': JSON.stringify(backup) }), 'invalidData')
  })

  it('rejects media paths outside the media folder', async () => {
    await seed()
    const backup = await collectBackupData()
    backup.data.dogs[0].photo!.path = '../evil.js'
    await expectBackupError(zipOf({ 'data.json': JSON.stringify(backup) }), 'invalidData')
  })
})

describe('isBackupDue', () => {
  const now = new Date('2026-11-01T12:00:00Z')

  it('is never due without data', () => {
    expect(isBackupDue(null, false, now)).toBe(false)
  })

  it('is due when there is data and no backup, or the last one is over 30 days old', () => {
    expect(isBackupDue(null, true, now)).toBe(true)
    expect(isBackupDue(new Date('2026-09-15T12:00:00Z'), true, now)).toBe(true)
    expect(isBackupDue(new Date('2026-10-20T12:00:00Z'), true, now)).toBe(false)
  })
})
