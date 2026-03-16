import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PiholeWidget } from '../../components/PiholeWidget.js'
import { PiholeStats } from '../../hooks/usePihole.js'

const mockStats: PiholeStats = {
  totalQueries: 150000,
  blockedQueries: 45000,
  blockedPercentage: 30.0,
  domainsOnBlocklist: 120000,
  status: 'enabled',
  blockedLastHour: 95,
  queriesLastHour: 300,
  clients: [],
}

describe('PiholeWidget', () => {
  it('renders nothing when loading', () => {
    const { container } = render(<PiholeWidget data={null} loading={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders nothing when no data', () => {
    const { container } = render(<PiholeWidget data={null} loading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders blocked last hour stat', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('95')).toBeDefined()
  })

  it('renders blocked percentage', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('30.0%')).toBeDefined()
  })

  it('renders green indicator dot when enabled', () => {
    const { container } = render(<PiholeWidget data={mockStats} loading={false} />)
    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
    expect((dot as HTMLElement).style.backgroundColor).toContain('var(--green)')
  })

  it('renders accent indicator dot when disabled', () => {
    const { container } = render(
      <PiholeWidget data={{ ...mockStats, status: 'disabled' }} loading={false} />
    )
    const dot = container.querySelector('.rounded-full')
    expect(dot).toBeTruthy()
    expect((dot as HTMLElement).style.backgroundColor).toContain('var(--accent)')
  })
})
