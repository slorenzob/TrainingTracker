import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders the tab bar in Spanish', async () => {
    render(<App />)
    for (const label of ['Perros', 'Ejercicios', 'Progreso', 'Ajustes']) {
      expect((await screen.findAllByText(label)).length).toBeGreaterThan(0)
    }
  })
})
