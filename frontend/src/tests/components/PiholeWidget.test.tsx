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
  clients: [
    {
      name: 'LivingRoomTV',
      ip: '192.168.1.40',
      queries: 1300,
      blockedQueries: 390,
      blockedPercentage: 30.0,
    },
    {
      name: 'iPhone',
      ip: '192.168.1.22',
      queries: 980,
      blockedQueries: 274,
      blockedPercentage: 28.0,
    },
    {
      name: '192.168.1.18',
      ip: '192.168.1.18',
      queries: 410,
      blockedQueries: 82,
      blockedPercentage: 20.0,
    },
  ],
}

describe('PiholeWidget', () => {
  it('renders a loading skeleton when loading', () => {
    const { container } = render(<PiholeWidget data={null} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders unavailable state when no data', () => {
    render(<PiholeWidget data={null} loading={false} />)
    expect(screen.getByText('Unavailable')).toBeDefined()
  })

  it('renders Pi-hole header with logo', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('Pi-hole')).toBeDefined()
    expect(screen.getByAltText('Pi-hole')).toBeDefined()
  })

  it('shows active status when enabled', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('● Active')).toBeDefined()
  })

  it('shows disabled status', () => {
    render(<PiholeWidget data={{ ...mockStats, status: 'disabled' }} loading={false} />)
    expect(screen.getByText('○ Disabled')).toBeDefined()
  })

  it('renders blocked last hour', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('95')).toBeDefined()
    expect(screen.getByText('Blk/hr')).toBeDefined()
  })

  it('renders blocked percentage', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getAllByText('30.0%').length).toBeGreaterThan(0)
  })

  it('renders total blocked with K formatting', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('45.0K')).toBeDefined()
  })

  it('renders total queries with K formatting', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('150.0K')).toBeDefined()
  })

  it('renders blocklist count', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.getByText('120.0K domains on blocklist')).toBeDefined()
  })

  it('does not render top-clients section', () => {
    render(<PiholeWidget data={mockStats} loading={false} />)
    expect(screen.queryByText('Top clients')).toBeNull()
  })
})
