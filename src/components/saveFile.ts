/**
 * Offers a generated file through the share sheet where supported (on mobile this lets the
 * user save it to Files or Drive, or open it in the calendar), falling back to a download.
 */
export async function saveFile(
  blob: Blob,
  fileName: string,
): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const file = new File([blob], fileName, { type: blob.type })
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
