import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MediaWidget } from '../../components/MediaWidget.js'
import { UpcomingItem } from '../../types/index.js'

function makeItem(overrides: Partial<UpcomingItem> = {}): UpcomingItem {
  return {
    title: 'Test Show',
    type: 'episode',
    date: '2026-03-12',
    subtitle: 'S01E01',
    ...overrides,
  }
}

describe('MediaWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-12T12:00:00'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders loading skeleton when loading', () => {
    const { container } = render(<MediaWidget items={[]} lastDayRemaining={0} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('returns null when items array is empty and not loading', () => {
    const { container } = render(<MediaWidget items={[]} lastDayRemaining={0} loading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders "Upcoming" heading', () => {
    render(<MediaWidget items={[makeItem()]} lastDayRemaining={1} loading={false} />)
    expect(screen.getByText('Upcoming')).toBeDefined()
  })

  it('shows "Today" for items with today date', () => {
    render(
      <MediaWidget
        items={[makeItem({ date: '2026-03-12' })]}
        lastDayRemaining={1}
        loading={false}
      />
    )
    expect(screen.getByText('Today')).toBeDefined()
  })

  it('shows "Tomorrow" for items with tomorrow date', () => {
    render(
      <MediaWidget
        items={[makeItem({ date: '2026-03-13' })]}
        lastDayRemaining={1}
        loading={false}
      />
    )
    expect(screen.getByText('Tomorrow')).toBeDefined()
  })

  it('shows formatted date for items further in the future', () => {
    render(
      <MediaWidget
        items={[makeItem({ date: '2026-03-15' })]}
        lastDayRemaining={1}
        loading={false}
      />
    )
    expect(screen.getByText(/Sun/)).toBeDefined()
    expect(screen.getByText(/Mar/)).toBeDefined()
    expect(screen.getByText(/15/)).toBeDefined()
  })

  it('groups items by date', () => {
    const items = [
      makeItem({ title: 'Show A', date: '2026-03-12' }),
      makeItem({ title: 'Show B', date: '2026-03-12' }),
      makeItem({ title: 'Show C', date: '2026-03-13' }),
    ]
    render(<MediaWidget items={items} lastDayRemaining={3} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
    expect(screen.getByText('Tomorrow')).toBeDefined()
    expect(screen.getByText('Show A')).toBeDefined()
    expect(screen.getByText('Show B')).toBeDefined()
    expect(screen.getByText('Show C')).toBeDefined()
  })

  it('renders episode emoji for episode type', () => {
    render(
      <MediaWidget items={[makeItem({ type: 'episode' })]} lastDayRemaining={1} loading={false} />
    )
    expect(screen.getByText('📺')).toBeDefined()
  })

  it('renders movie emoji for movie type', () => {
    render(
      <MediaWidget
        items={[makeItem({ type: 'movie', title: 'A Movie' })]}
        lastDayRemaining={1}
        loading={false}
      />
    )
    expect(screen.getByText('🎬')).toBeDefined()
  })

  it('renders item title and subtitle', () => {
    render(
      <MediaWidget
        items={[makeItem({ title: 'Breaking Bad', subtitle: 'S05E16' })]}
        lastDayRemaining={1}
        loading={false}
      />
    )
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('S05E16')).toBeDefined()
  })

  it('shows truncation indicator when lastDayRemaining > 0', () => {
    const items = [makeItem({ title: 'Show 1' }), makeItem({ title: 'Show 2' })]
    render(<MediaWidget items={items} lastDayRemaining={5} loading={false} />)
    expect(screen.getByText('& 5 more upcoming')).toBeDefined()
  })

  it('does not show truncation indicator when lastDayRemaining is 0', () => {
    const items = [makeItem({ title: 'Show 1' })]
    render(<MediaWidget items={items} lastDayRemaining={0} loading={false} />)
    expect(screen.queryByText(/more upcoming/)).toBeNull()
  })
})
