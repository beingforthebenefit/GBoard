import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T14:30:45'),
}))

import { FlapClock } from '../../components/FlapClock.js'

describe('FlapClock', () => {
  it('renders the time as flap tiles', () => {
    const { container } = render(<FlapClock />)
    expect(container.textContent).toContain('2:30')
    // 4 time tiles + 2 seconds tiles
    expect(container.querySelectorAll('.flap-tile').length).toBe(6)
  })

  it('renders flipping seconds tiles', () => {
    const { container } = render(<FlapClock />)
    expect(container.textContent).toContain('45')
  })

  it('shows the meridiem', () => {
    const { getByText } = render(<FlapClock />)
    expect(getByText('PM')).toBeTruthy()
  })
})
