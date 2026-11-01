import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { imageFile } from '../test/factories'
import { memoryMedia } from '../test/setup'
import { saveMedia } from './mediaStore'
import { useMediaDraft } from './useMediaDraft'

describe('useMediaDraft', () => {
  it('deletes files picked during the edit when it is discarded', async () => {
    const existing = await saveMedia(imageFile('existing.jpg'))
    const { result } = renderHook(() => useMediaDraft([existing]))

    await act(() => result.current.add([imageFile('new.jpg')]))
    expect(result.current.media).toHaveLength(2)
    expect(memoryMedia.files.size).toBe(2)

    await act(() => result.current.discard())
    expect([...memoryMedia.files.keys()]).toEqual([existing.path])
  })

  it('deletes a newly picked file immediately when removed, but not a pre-existing one', async () => {
    const existing = await saveMedia(imageFile('existing.jpg'))
    const { result } = renderHook(() => useMediaDraft([existing]))
    const [added] = await act(() => result.current.add([imageFile('new.jpg')]))

    await act(() => result.current.remove(added))
    await act(() => result.current.remove(existing))

    expect(result.current.media).toEqual([])
    // The saved record still owns `existing`; the repository deletes it on save.
    expect([...memoryMedia.files.keys()]).toEqual([existing.path])
  })

  it('keeps committed files when the edit later ends', async () => {
    const { result } = renderHook(() => useMediaDraft())
    await act(() => result.current.add([imageFile()]))
    act(() => result.current.commit())
    await act(() => result.current.discard())
    expect(memoryMedia.files.size).toBe(1)
  })
})
