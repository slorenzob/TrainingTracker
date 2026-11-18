import { useEffect, useState } from 'react'

/** `system` follows the device; `light` and `dark` force a palette. */
export type ColorScheme = 'system' | 'light' | 'dark'
export const COLOR_SCHEMES: readonly ColorScheme[] = ['system', 'light', 'dark']

const KEY = 'theme.colorScheme'
const EVENT = 'training-tracker:color-scheme'
/** Ionic's class-based dark palette (palettes/dark.class.css); variables.css restyles it. */
const DARK_CLASS = 'ion-palette-dark'
/** Browser chrome colours: the M3 surface of each palette (see variables.css). */
const THEME_COLOR = { light: '#f5fbf7', dark: '#0f1513' } as const

const darkQuery = (): MediaQueryList | null =>
  typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-color-scheme: dark)') : null

function isColorScheme(value: unknown): value is ColorScheme {
  return COLOR_SCHEMES.includes(value as ColorScheme)
}

// Per-device on purpose, like the backup date. Storage may be unavailable.
export function getColorScheme(): ColorScheme {
  try {
    const value = localStorage.getItem(KEY)
    return isColorScheme(value) ? value : 'system'
  } catch {
    return 'system'
  }
}

export function setColorScheme(scheme: ColorScheme): void {
  try {
    if (scheme === 'system') localStorage.removeItem(KEY)
    else localStorage.setItem(KEY, scheme)
  } catch {
    // Ignore: it still applies until the app is reloaded.
  }
  applyColorScheme(scheme)
  window.dispatchEvent(new Event(EVENT))
}

function applyColorScheme(scheme: ColorScheme): void {
  const dark = scheme === 'system' ? (darkQuery()?.matches ?? false) : scheme === 'dark'
  const root = document.documentElement
  root.classList.toggle(DARK_CLASS, dark)
  // Native controls (scrollbars, date pickers) follow the chosen palette too.
  root.style.colorScheme = dark ? 'dark' : 'light'
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    meta.content = THEME_COLOR[dark ? 'dark' : 'light']
  }
}

/**
 * Applies the saved scheme and keeps `system` in sync with the device setting.
 * Call once before the first render so the app never flashes the wrong palette.
 */
export function initColorScheme(): void {
  applyColorScheme(getColorScheme())
  darkQuery()?.addEventListener('change', () => {
    if (getColorScheme() === 'system') applyColorScheme('system')
  })
}

export function useColorScheme(): ColorScheme {
  const [value, setValue] = useState(getColorScheme)
  useEffect(() => {
    const update = () => setValue(getColorScheme())
    window.addEventListener(EVENT, update)
    return () => window.removeEventListener(EVENT, update)
  }, [])
  return value
}
