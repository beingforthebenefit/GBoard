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
  it('renders nothing when not loading and no session', () => {
    const { container } = render(<PlexWidget session={null} loading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders a loading skeleton when loading', () => {
    const { container } = render(<PlexWidget session={null} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders the title and subtitle', () => {
    render(<PlexWidget session={baseSession} loading={false} />)
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('S02E03 – Seven Thirty-Seven')).toBeDefined()
  })

  it('renders the user name', () => {
    render(<PlexWidget session={baseSession} loading={false} />)
    expect(screen.getByText('Gerald')).toBeDefined()
  })

  it('renders elapsed and total time', () => {
    render(<PlexWidget session={baseSession} loading={false} />)
    expect(screen.getByText('10:00')).toBeDefined()
    expect(screen.getByText('45:00')).toBeDefined()
  })

  it('renders time with hours when duration exceeds 1 hour', () => {
    const longSession: PlexSession = {
      ...baseSession,
      viewOffset: 3661000, // 1:01:01
      duration: 7200000, // 2:00:00
    }
    render(<PlexWidget session={longSession} loading={false} />)
    expect(screen.getByText('1:01:01')).toBeDefined()
    expect(screen.getByText('2:00:00')).toBeDefined()
  })

  it('shows pause indicator when paused', () => {
    const pausedSession: PlexSession = { ...baseSession, playerState: 'paused' }
    render(<PlexWidget session={pausedSession} loading={false} />)
    expect(screen.getByText('⏸')).toBeDefined()
  })

  it('renders progress bar with correct width', () => {
    const { container } = render(<PlexWidget session={baseSession} loading={false} />)
    const bar = container.querySelector('.bg-yellow-400')
    expect(bar).toBeTruthy()
    // 600000 / 2700000 = 22%
    expect((bar as HTMLElement).style.width).toBe('22%')
  })
})
