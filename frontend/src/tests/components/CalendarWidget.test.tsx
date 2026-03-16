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
  it('renders nothing when loading', () => {
    const { container } = render(<CalendarWidget events={[]} loading={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders "Today" as first day label', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
  })

  it('renders 5 day rows', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    const dayLabels = screen.getAllByText(/Today|Sun|Mon|Tue|Wed|Thu|Fri|Sat/)
    expect(dayLabels.length).toBeGreaterThanOrEqual(5)
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

  it('shows dash for days with no events', () => {
    render(<CalendarWidget events={[]} loading={false} />)
    const dashes = screen.getAllByText('—')
    expect(dashes.length).toBeGreaterThanOrEqual(1)
  })
})
