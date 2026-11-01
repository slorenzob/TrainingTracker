import type { ExerciseLink } from '../../db/types'
import { isHttpUrl } from '../../db/validation'

export interface LinkDraft {
  key: string
  url: string
  label: string
}

export const emptyLink = (): LinkDraft => ({ key: crypto.randomUUID(), url: '', label: '' })

export const toLinkDrafts = (links: readonly ExerciseLink[]): LinkDraft[] =>
  links.map((l) => ({ key: crypto.randomUUID(), url: l.url, label: l.label ?? '' }))

export type ExerciseFormErrors = { title?: true; invalidLinkKeys: string[] }

/** Drops empty link rows and trims values; reports a missing title and malformed URLs. */
export function validateExerciseForm(title: string, links: readonly LinkDraft[]) {
  const errors: ExerciseFormErrors = { invalidLinkKeys: [] }
  if (!title.trim()) errors.title = true
  const cleaned: ExerciseLink[] = []
  for (const link of links) {
    const url = link.url.trim()
    const label = link.label.trim()
    if (!url && !label) continue
    if (!isHttpUrl(url)) {
      errors.invalidLinkKeys.push(link.key)
      continue
    }
    cleaned.push(label ? { url, label } : { url })
  }
  const valid = !errors.title && errors.invalidLinkKeys.length === 0
  return { valid, errors, links: cleaned }
}
