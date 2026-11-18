import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getColorScheme, initColorScheme, setColorScheme } from './colorScheme'

const root = document.documentElement

function mockDeviceDark(dark: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = []
  const query = {
    matches: dark,
    addEventListener: (_: string, listener: (e: MediaQueryListEvent) => void) =>
      listeners.push(listener),
  }
  vi.stubGlobal('matchMedia', () => query)
  return (next: boolean) => {
    query.matches = next
    listeners.forEach((listener) => listener({ matches: next } as MediaQueryListEvent))
  }
}

describe('color scheme', () => {
  beforeEach(() => {
    localStorage.clear()
    root.classList.remove('ion-palette-dark')
  })
  afterEach(() => vi.unstubAllGlobals())

  it('defaults to following the device', () => {
    expect(getColorScheme()).toBe('system')
  })

  it('ignores an unknown saved value', () => {
    localStorage.setItem('theme.colorScheme', 'sepia')
    expect(getColorScheme()).toBe('system')
  })

  it('forces dark and light regardless of the device', () => {
    mockDeviceDark(false)
    setColorScheme('dark')
    expect(getColorScheme()).toBe('dark')
    expect(root.classList.contains('ion-palette-dark')).toBe(true)

    mockDeviceDark(true)
    setColorScheme('light')
    expect(root.classList.contains('ion-palette-dark')).toBe(false)
  })

  it('follows device changes only in automatic mode', () => {
    const changeDevice = mockDeviceDark(false)
    initColorScheme()
    expect(root.classList.contains('ion-palette-dark')).toBe(false)

    changeDevice(true)
    expect(root.classList.contains('ion-palette-dark')).toBe(true)

    setColorScheme('light')
    changeDevice(true)
    expect(root.classList.contains('ion-palette-dark')).toBe(false)
  })
})
