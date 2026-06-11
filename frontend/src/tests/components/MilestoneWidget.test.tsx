import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2024-02-15T12:00:00'),
}))

import { MilestoneWidget } from '../../components/MilestoneWidget.js'

describe('MilestoneWidget', () => {
  it('shows the countdown to the next milestone', () => {
    const { getByText } = render(<MilestoneWidget sobrietyDate="2024-01-01T00:00:00" />)
    expect(getByText(/14 days to 60 days/)).toBeTruthy()
  })

  it('shows total days sober', () => {
    const { getByText } = render(<MilestoneWidget sobrietyDate="2024-01-01T00:00:00" />)
    expect(getByText(/45 days strong/)).toBeTruthy()
  })

  it('renders the days remaining inside the ring', () => {
    const { container } = render(<MilestoneWidget sobrietyDate="2024-01-01T00:00:00" />)
    expect(container.querySelector('svg text')?.textContent).toBe('14')
  })

  it('renders a progress ring with a dash array', () => {
    const { container } = render(<MilestoneWidget sobrietyDate="2024-01-01T00:00:00" />)
    const circles = container.querySelectorAll('circle')
    expect(circles.length).toBe(2)
    expect(circles[1].getAttribute('stroke-dasharray')).toBeTruthy()
  })
})
