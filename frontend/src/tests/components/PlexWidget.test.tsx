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
    expect(screen.getByText(/S02E03/)).toBeDefined()
  })

  it('renders the user name', () => {
    render(<PlexWidget sessions={[baseSession]} loading={false} />)
    expect(screen.getByText(/Gerald/)).toBeDefined()
  })

  it('renders "Now Playing" label', () => {
    render(<PlexWidget sessions={[baseSession]} loading={false} />)
    expect(screen.getByText('Now Playing')).toBeDefined()
  })

  it('renders progress bar with correct width', () => {
    const { container } = render(<PlexWidget sessions={[baseSession]} loading={false} />)
    const bars = container.querySelectorAll('.rounded-full')
    // Find the progress fill bar (the one with a width style)
    const progressBar = Array.from(bars).find(
      (el) => (el as HTMLElement).style.width
    ) as HTMLElement
    expect(progressBar).toBeTruthy()
    // 600000 / 2700000 = 22%
    expect(progressBar.style.width).toBe('22%')
  })

  it('renders one card per active session', () => {
    const other: PlexSession = { ...baseSession, title: 'Inception', userName: 'Alice' }
    render(<PlexWidget sessions={[baseSession, other]} loading={false} />)
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('Inception')).toBeDefined()
  })
})
