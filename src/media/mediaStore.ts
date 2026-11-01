import { newId } from '../db/utils'
import type { MediaRef } from '../db/types'

/** Where uploaded images and videos live; the database only keeps MediaRef pointers. */
export interface MediaStore {
  write(path: string, data: Blob): Promise<void>
  read(path: string): Promise<File>
  remove(path: string): Promise<void>
}

const MEDIA_DIR = 'media'

function extensionOf(file: File): string {
  const fromName = /\.([a-z0-9]+)$/i.exec(file.name)?.[1]
  if (fromName) return fromName.toLowerCase()
  return file.type.split('/')[1]?.split(/[+;]/)[0] ?? 'bin'
}

/** Origin Private File System: real files private to this app, available on Android and iOS. */
export const opfsMediaStore: MediaStore = {
  async write(path, data) {
    const { dir, name } = await resolve(path, true)
    const handle = await dir.getFileHandle(name, { create: true })
    const writable = await handle.createWritable()
    await writable.write(data)
    await writable.close()
  },
  async read(path) {
    const { dir, name } = await resolve(path, false)
    const handle = await dir.getFileHandle(name)
    return handle.getFile()
  },
  async remove(path) {
    try {
      const { dir, name } = await resolve(path, false)
      await dir.removeEntry(name)
    } catch (e) {
      if ((e as DOMException).name !== 'NotFoundError') throw e
    }
  },
}

async function resolve(path: string, create: boolean) {
  const parts = path.split('/').filter(Boolean)
  const name = parts.pop()
  if (!name) throw new Error(`Invalid media path: ${path}`)
  let dir = await navigator.storage.getDirectory()
  for (const part of parts) dir = await dir.getDirectoryHandle(part, { create })
  return { dir, name }
}

/** In-memory store, used by tests. */
export function createMemoryMediaStore(): MediaStore & { files: Map<string, File> } {
  const files = new Map<string, File>()
  return {
    files,
    async write(path, data) {
      const name = path.split('/').pop() ?? path
      files.set(path, new File([data], name, { type: data.type }))
    },
    async read(path) {
      const file = files.get(path)
      if (!file) throw new DOMException(`Not found: ${path}`, 'NotFoundError')
      return file
    },
    async remove(path) {
      files.delete(path)
    },
  }
}

let current: MediaStore = opfsMediaStore

export const getMediaStore = (): MediaStore => current

export function setMediaStore(store: MediaStore): void {
  current = store
}

/** Copies a picked/captured file into the media store and returns its reference. */
export async function saveMedia(file: File): Promise<MediaRef> {
  const id = newId()
  const path = `${MEDIA_DIR}/${id}.${extensionOf(file)}`
  await current.write(path, file)
  return {
    id,
    path,
    mime: file.type || 'application/octet-stream',
    size: file.size,
    originalName: file.name,
  }
}

export const readMedia = (ref: MediaRef): Promise<File> => current.read(ref.path)

export async function deleteMedia(refs: readonly MediaRef[]): Promise<void> {
  await Promise.all(refs.map((ref) => current.remove(ref.path)))
}
