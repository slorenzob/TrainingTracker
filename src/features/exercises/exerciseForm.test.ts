import { describe, expect, it } from 'vitest'
import { emptyLink, validateExerciseForm, type LinkDraft } from './exerciseForm'

const link = (url: string, label = ''): LinkDraft => ({ ...emptyLink(), url, label })

describe('validateExerciseForm', () => {
  it('requires a title', () => {
    expect(validateExerciseForm('  ', []).errors.title).toBe(true)
    expect(validateExerciseForm('Sentado', []).valid).toBe(true)
  })

  it('drops empty rows and trims links, omitting empty labels', () => {
    const result = validateExerciseForm('X', [
      link(' https://a.com ', ' Vídeo '),
      link('', ''),
      link('https://b.com'),
    ])
    expect(result.valid).toBe(true)
    expect(result.links).toEqual([
      { url: 'https://a.com', label: 'Vídeo' },
      { url: 'https://b.com' },
    ])
  })

  it('flags malformed URLs, including a label without URL', () => {
    const bad = link('youtube sentado')
    const labelOnly = link('', 'Sin URL')
    const result = validateExerciseForm('X', [bad, labelOnly, link('ftp://x.com')])
    expect(result.valid).toBe(false)
    expect(result.errors.invalidLinkKeys).toHaveLength(3)
    expect(result.errors.invalidLinkKeys).toContain(bad.key)
    expect(result.errors.invalidLinkKeys).toContain(labelOnly.key)
  })
})
