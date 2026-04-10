import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CalendarGrid } from '../../components/CalendarGrid.js'
import { CalendarEvent } from '../../types/index.js'

// Freeze time so getDays() always anchors to April 10, 2026 (UTC = local in test env)
const TODAY = '2026-04-10'
const TOMORROW = '2026-04-11'
const YESTERDAY = '2026-04-09'

function makeEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'test-event',
    title: 'Test Event',
    start: `${TODAY}T10:00:00Z`,
    end: `${TODAY}T11:00:00Z`,
    allDay: false,
    calendarIndex: 0,
    ...overrides,
  }
}

describe('CalendarGrid', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(`${TODAY}T12:00:00Z`))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders nothing when loading', () => {
    const { container } = render(<CalendarGrid events={[]} loading={true} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders a basic timed event on today', () => {
    const event = makeEvent({ title: 'Morning Meeting' })
    render(<CalendarGrid events={[event]} loading={false} />)
    expect(screen.getByText('Morning Meeting')).toBeDefined()
  })

  it('does not render a timed event outside visible grid hours (1 AM–2 AM)', () => {
    const event = makeEvent({
      title: 'Early Bird',
      start: `${TODAY}T01:00:00Z`,
      end: `${TODAY}T02:00:00Z`,
    })
    render(<CalendarGrid events={[event]} loading={false} />)
    expect(screen.queryByText('Early Bird')).toBeNull()
  })

  describe('events crossing midnight', () => {
    it('renders a timed event that crosses midnight (ends at midnight = next day 00:00)', () => {
      // Bug: eventLayout computed endH = midnight.getHours() = 0, which is <= HOUR_START (9),
      // so eventLayout returned null and the event was never rendered.
      const event = makeEvent({
        title: 'Late Night Show',
        start: `${TODAY}T21:00:00Z`,
        end: `${TOMORROW}T00:00:00Z`,
      })
      render(<CalendarGrid events={[event]} loading={false} />)
      expect(screen.getByText('Late Night Show')).toBeDefined()
    })

    it('renders a timed event that ends partway through the next day', () => {
      const event = makeEvent({
        title: 'Overnight Party',
        start: `${TODAY}T20:00:00Z`,
        end: `${TOMORROW}T02:00:00Z`,
      })
      render(<CalendarGrid events={[event]} loading={false} />)
      expect(screen.getByText('Overnight Party')).toBeDefined()
    })
  })

  describe('events starting before today (cross-day into the grid window)', () => {
    it('renders a timed event that started yesterday and ends within grid hours today', () => {
      // Bug: filter was dayKey(start) === key, so yesterday's events were never shown in today's column.
      const event = makeEvent({
        title: 'Cross-Day Meeting',
        start: `${YESTERDAY}T23:00:00Z`,
        end: `${TODAY}T10:00:00Z`,
      })
      render(<CalendarGrid events={[event]} loading={false} />)
      expect(screen.getByText('Cross-Day Meeting')).toBeDefined()
    })

    it('does not render a timed event that started yesterday and ended before grid hours today', () => {
      // Event ended at 2 AM today — before HOUR_START (9 AM), so not visible in the time grid.
      const event = makeEvent({
        title: 'Very Late Night',
        start: `${YESTERDAY}T23:00:00Z`,
        end: `${TODAY}T02:00:00Z`,
      })
      render(<CalendarGrid events={[event]} loading={false} />)
      expect(screen.queryByText('Very Late Night')).toBeNull()
    })
  })

  describe('all-day events', () => {
    it('renders a single-day all-day event on its day', () => {
      const event = makeEvent({
        title: 'Holiday',
        start: `${TODAY}T00:00:00Z`,
        end: `${TOMORROW}T00:00:00Z`,
        allDay: true,
      })
      render(<CalendarGrid events={[event]} loading={false} />)
      expect(screen.getByText('Holiday')).toBeDefined()
    })

    it('renders a multi-day all-day event on each day it spans', () => {
      // Bug: filter was dayKey(start) === key, so a 3-day event only appeared on its start day.
      // iCal DTEND is exclusive: end=Apr 13 means the event spans Apr 10, 11, 12.
      const event = makeEvent({
        title: 'Conference',
        start: `${TODAY}T00:00:00Z`,
        end: `2026-04-13T00:00:00Z`,
        allDay: true,
      })
      render(<CalendarGrid events={[event]} loading={false} numDays={5} />)
      const instances = screen.getAllByText('Conference')
      expect(instances.length).toBe(3)
    })

    it('does not show a multi-day all-day event on its exclusive end day', () => {
      // iCal DTEND Apr 12 means the event covers Apr 10–11 only (Apr 12 is excluded).
      const event = makeEvent({
        title: 'Weekend Trip',
        start: `${TODAY}T00:00:00Z`,
        end: `2026-04-12T00:00:00Z`,
        allDay: true,
      })
      render(<CalendarGrid events={[event]} loading={false} numDays={5} />)
      const instances = screen.getAllByText('Weekend Trip')
      expect(instances.length).toBe(2) // Apr 10 and Apr 11 only
    })
  })
})
