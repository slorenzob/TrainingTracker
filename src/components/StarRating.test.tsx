import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { describe, expect, it } from 'vitest'
import StarRating from './StarRating'

function Controlled() {
  const [value, setValue] = useState<number>()
  return (
    <>
      <StarRating label="Sentado" value={value} onChange={setValue} />
      <output>{value ?? 'none'}</output>
    </>
  )
}

describe('StarRating', () => {
  it('sets a rating and clears it when the same star is tapped again', async () => {
    const user = userEvent.setup()
    render(<Controlled />)
    const group = screen.getByRole('radiogroup', { name: 'Sentado' })
    expect(group).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '4 estrellas' }))
    expect(screen.getByText('4')).toBeInTheDocument()
    expect(screen.getByRole('radio', { name: '4 estrellas' })).toHaveAttribute(
      'aria-checked',
      'true',
    )

    await user.click(screen.getByRole('radio', { name: '4 estrellas' }))
    expect(screen.getByText('none')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: '1 estrella' }))
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders a read-only value with an accessible description', () => {
    render(<StarRating label="Quieto" value={3} />)
    expect(screen.getByRole('img', { name: 'Quieto: 3 estrellas' })).toBeInTheDocument()
    expect(screen.queryByRole('radio')).not.toBeInTheDocument()
  })
})
