import { useCallback, useRef, useState } from 'react'
import type { MediaRef } from '../db/types'
import { deleteMedia, saveMedia } from './mediaStore'

/**
 * Media list being edited in a form. Files are written to the store as soon as they are
 * picked; files added during this edit are deleted again if they are removed or the edit
 * is discarded. Pre-existing files are left alone: the repository deletes them on save.
 */
export function useMediaDraft(initial: readonly MediaRef[] = []) {
  const [media, setMedia] = useState<MediaRef[]>([...initial])
  /** Files written during this edit that no saved record owns yet. */
  const pending = useRef(new Map<string, MediaRef>())

  const add = useCallback(async (files: readonly File[]) => {
    const refs: MediaRef[] = []
    for (const file of files) refs.push(await saveMedia(file))
    refs.forEach((ref) => pending.current.set(ref.id, ref))
    setMedia((current) => [...current, ...refs])
    return refs
  }, [])

  const remove = useCallback(async (ref: MediaRef) => {
    setMedia((current) => current.filter((m) => m.id !== ref.id))
    if (pending.current.delete(ref.id)) await deleteMedia([ref])
  }, [])

  /** Loads another record's media, e.g. when an edit form finishes loading. */
  const reset = useCallback((next: readonly MediaRef[]) => {
    pending.current.clear()
    setMedia([...next])
  }, [])

  /** Call after the record has been saved: the new files now belong to it. */
  const commit = useCallback(() => pending.current.clear(), [])

  /** Call when the edit is abandoned: deletes the files picked during it. */
  const discard = useCallback(async () => {
    const orphans = [...pending.current.values()]
    pending.current.clear()
    await deleteMedia(orphans)
  }, [])

  return { media, add, remove, reset, commit, discard }
}
