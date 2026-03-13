import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { PlexWidget } from '../../components/PlexWidget.js'
import { PlexSession } from '../../types/index.js'

const baseSession: PlexSession = {
  title: 'Breaking Bad',
  type: 'episode',
  subtitle: 'S02E03 – Seven Thirty-Seven',
  thumbPath: '/library/metadata/123/thumb',
  userName: 'Gerald',
  userAvatar: null,
  viewOffset: 600000, // 10:00
  duration: 2700000, // 45:00
  playerState: 'playing',
}

describe('PlexWidget', () => {
  it('does not render anything when not loading and no session', () => {
    const { container } = render(<PlexWidget sessions={[]} loading={false} />)
    expect(container.firstChild).toBeNull()
  })

  it('renders a loading skeleton when loading', () => {
    const { container } = render(<PlexWidget sessions={[]} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders the title and subtitle', () => {
    render(<PlexWidget sessions={[baseSession]} loading={false} />)
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('S02E03 – Seven Thirty-Seven')).toBeDefined()
  })

  it('renders the user name', () => {
    render(<PlexWidget sessions={[baseSession]} loading={false} />)
    expect(screen.getByText('Gerald')).toBeDefined()
  })

  it('shows pause indicator when paused', () => {
    const pausedSession: PlexSession = { ...baseSession, playerState: 'paused' }
    render(<PlexWidget sessions={[pausedSession]} loading={false} />)
    expect(screen.getByText('⏸')).toBeDefined()
  })

  it('shows play indicator when playing', () => {
    render(<PlexWidget sessions={[baseSession]} loading={false} />)
    expect(screen.getByText('▶')).toBeDefined()
  })

  it('renders progress bar with correct width', () => {
    const { container } = render(<PlexWidget sessions={[baseSession]} loading={false} />)
    const bar = container.querySelector('.bg-yellow-400')
    expect(bar).toBeTruthy()
    // 600000 / 2700000 = 22%
    expect((bar as HTMLElement).style.width).toBe('22%')
  })

  it('renders one card per active session', () => {
    const other: PlexSession = { ...baseSession, title: 'Inception', userName: 'Alice' }
    render(<PlexWidget sessions={[baseSession, other]} loading={false} />)
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('Inception')).toBeDefined()
    expect(screen.getByText('Gerald')).toBeDefined()
    expect(screen.getByText('Alice')).toBeDefined()
  })
})
