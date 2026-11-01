import { useEffect, useState } from 'react'
import type { MediaRef } from '../db/types'
import { getMediaStore } from './mediaStore'

export type MediaUrlState =
  { status: 'loading' } | { status: 'ready'; url: string } | { status: 'missing' }

/** Object URL for a stored file, revoked when the component unmounts or the ref changes. */
export function useMediaUrl(ref: MediaRef | undefined): MediaUrlState {
  const [state, setState] = useState<MediaUrlState>({ status: 'loading' })
  const path = ref?.path

  useEffect(() => {
    if (!path) {
      setState({ status: 'missing' })
      return
    }
    let url: string | undefined
    let cancelled = false
    setState({ status: 'loading' })
    getMediaStore()
      .read(path)
      .then((file) => {
        if (cancelled) return
        url = URL.createObjectURL(file)
        setState({ status: 'ready', url })
      })
      .catch(() => {
        if (!cancelled) setState({ status: 'missing' })
      })
    return () => {
      cancelled = true
      if (url) URL.revokeObjectURL(url)
    }
  }, [path])

  return state
}

export const isVideo = (ref: MediaRef) => ref.mime.startsWith('video/')
