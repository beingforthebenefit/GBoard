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

  it('returns null when loading', () => {
    const { container } = render(<MediaWidget items={[]} loading={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('returns null when items array is empty and not loading', () => {
    const { container } = render(<MediaWidget items={[]} loading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders "Upcoming" heading', () => {
    render(<MediaWidget items={[makeItem()]} loading={false} />)
    expect(screen.getByText('Upcoming')).toBeDefined()
  })

  it('shows "Today" for items with today date', () => {
    render(<MediaWidget items={[makeItem({ date: '2026-03-12' })]} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
  })

  it('shows "Tomorrow" for items with tomorrow date', () => {
    render(<MediaWidget items={[makeItem({ date: '2026-03-13' })]} loading={false} />)
    expect(screen.getByText('Tomorrow')).toBeDefined()
  })

  it('shows formatted date for items further in the future', () => {
    render(<MediaWidget items={[makeItem({ date: '2026-03-15' })]} loading={false} />)
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
    render(<MediaWidget items={items} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
    expect(screen.getByText('Tomorrow')).toBeDefined()
    expect(screen.getByText('Show A')).toBeDefined()
    expect(screen.getByText('Show B')).toBeDefined()
    expect(screen.getByText('Show C')).toBeDefined()
  })

  it('renders item title and subtitle', () => {
    render(
      <MediaWidget
        items={[makeItem({ title: 'Breaking Bad', subtitle: 'S05E16' })]}
        loading={false}
      />
    )
    expect(screen.getByText('Breaking Bad')).toBeDefined()
    expect(screen.getByText('S05E16')).toBeDefined()
  })

  it('combines same-show episodes on the same date', () => {
    const items = [
      makeItem({ title: 'Family Guy', subtitle: 'S24E08', date: '2026-03-12' }),
      makeItem({ title: 'Family Guy', subtitle: 'S24E09', date: '2026-03-12' }),
    ]
    render(<MediaWidget items={items} loading={false} />)
    expect(screen.getByText('Family Guy')).toBeDefined()
    expect(screen.getByText('S24E08, E09')).toBeDefined()
  })

  it('does not combine episodes from different shows', () => {
    const items = [
      makeItem({ title: 'Show A', subtitle: 'S01E01', date: '2026-03-12' }),
      makeItem({ title: 'Show B', subtitle: 'S01E01', date: '2026-03-12' }),
    ]
    render(<MediaWidget items={items} loading={false} />)
    expect(screen.getByText('Show A')).toBeDefined()
    expect(screen.getByText('Show B')).toBeDefined()
  })

  it('always includes today and tomorrow items regardless of container height', () => {
    const items = [
      makeItem({ title: 'Today Show', date: '2026-03-12' }),
      makeItem({ title: 'Tomorrow Show', date: '2026-03-13' }),
      makeItem({ title: 'Future Show', date: '2026-03-15' }),
    ]
    render(<MediaWidget items={items} loading={false} />)
    expect(screen.getByText('Today Show')).toBeDefined()
    expect(screen.getByText('Tomorrow Show')).toBeDefined()
  })
})
