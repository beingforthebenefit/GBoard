import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarWidget } from '../../components/CalendarWidget.js'
import { CalendarEvent } from '../../types/index.js'

const FIXED_DATE = new Date('2026-03-07T14:00:00')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

const makeEvent = (
  overrides: Partial<CalendarEvent> & { start: string; end: string }
): CalendarEvent => ({
  id: 'evt-' + Math.random().toString(36).slice(2),
  title: 'Test Event',
  allDay: false,
  ...overrides,
})

describe('CalendarWidget', () => {
  it('renders a loading skeleton when loading', () => {
    const { container } = render(<CalendarWidget events={[]} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders "Today" as first day header', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
  })

  it('renders 5 day columns', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    // "Today" plus 4 more day headers
    const dayHeaders = screen.getAllByText(/Today|Sun|Mon|Tue|Wed|Thu|Fri|Sat/)
    expect(dayHeaders.length).toBeGreaterThanOrEqual(5)
  })

  it('renders time gutter labels', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    expect(screen.getByText('9a')).toBeDefined()
    expect(screen.getByText('12p')).toBeDefined()
    expect(screen.getByText('5p')).toBeDefined()
  })

  it('renders a timed event title', () => {
    const event = makeEvent({
      title: 'Team Meeting',
      start: '2026-03-07T14:00:00',
      end: '2026-03-07T15:00:00',
    })
    render(<CalendarWidget events={[event]} loading={false} />)
    expect(screen.getByText('Team Meeting')).toBeDefined()
  })

  it('renders an all-day event', () => {
    const event = makeEvent({
      title: 'Birthday',
      start: '2026-03-07T00:00:00',
      end: '2026-03-08T00:00:00',
      allDay: true,
    })
    render(<CalendarWidget events={[event]} loading={false} />)
    expect(screen.getByText('Birthday')).toBeDefined()
  })

  it('places all-day event on correct day even with UTC midnight timestamp', () => {
    // All-day event for March 8 sent as UTC midnight — should NOT appear on March 7
    const event = makeEvent({
      title: 'Tomorrow Event',
      start: '2026-03-08T00:00:00.000Z',
      end: '2026-03-09T00:00:00.000Z',
      allDay: true,
    })
    const todayEvent = makeEvent({
      title: 'Today Event',
      start: '2026-03-07T00:00:00.000Z',
      end: '2026-03-08T00:00:00.000Z',
      allDay: true,
    })
    render(<CalendarWidget events={[event, todayEvent]} loading={false} />)
    expect(screen.getByText('Tomorrow Event')).toBeDefined()
    expect(screen.getByText('Today Event')).toBeDefined()
  })

  it('does not render events outside the visible hour range', () => {
    const event = makeEvent({
      title: 'Early Morning',
      start: '2026-03-07T05:00:00',
      end: '2026-03-07T06:00:00',
    })
    render(<CalendarWidget events={[event]} loading={false} />)
    expect(screen.queryByText('Early Morning')).toBeNull()
  })
})
