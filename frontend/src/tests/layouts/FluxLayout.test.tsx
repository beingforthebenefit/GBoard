import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T14:30:00'),
}))

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

import { FluxLayout } from '../../layouts/flux/FluxLayout.js'
import { CalendarEvent } from '../../types/index.js'

function eventAt(id: string, title: string, hoursFromNow: number): CalendarEvent {
  const start = new Date(Date.now() + hoursFromNow * 3600_000)
  const end = new Date(start.getTime() + 3600_000)
  return { id, title, start: start.toISOString(), end: end.toISOString(), allDay: false }
}

const mockProps = {
  weatherData: {
    current: {
      temp: 72,
      feelsLike: 70,
      humidity: 45,
      description: 'clear sky',
      icon: '01d',
      windSpeed: 8,
      windDirection: 'NW',
      windGust: null,
      sunrise: 1700000000,
      sunset: 1700040000,
      dewPoint: 55,
      pressure: 1013,
      visibility: 10,
    },
    forecast: [],
    hourly: [],
  },
  weatherLoading: false,
  events: [eventAt('1', 'Standup', 3)],
  calendarLoading: false,
  sessions: [],
  plexLoading: false,
  piholeData: {
    status: 'enabled' as const,
    totalQueries: 50000,
    blockedQueries: 7600,
    blockedPercentage: 15.2,
    domainsOnBlocklist: 100000,
    blockedLastHour: 200,
    queriesLastHour: 1200,
    clients: [],
  },
  piholeLoading: false,
  photos: [],
  mediaItems: [],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  radarMode: 'adaptive' as const,
  sobrietyDate: '2024-01-01T00:00:00',
}

describe('FluxLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<FluxLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the flow-field canvas behind the widgets', () => {
    const { container } = render(<FluxLayout {...mockProps} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('shows the clock time', () => {
    const { getByText } = render(<FluxLayout {...mockProps} />)
    expect(getByText('2:30')).toBeTruthy()
  })

  it('shows the sober hero with counter values', () => {
    const { getAllByText, getByText } = render(<FluxLayout {...mockProps} />)
    expect(getByText('Sober')).toBeTruthy()
    expect(getByText('yr')).toBeTruthy()
    expect(getAllByText('1').length).toBeGreaterThan(0)
  })

  it('shows the weather temperature', () => {
    const { getByText } = render(<FluxLayout {...mockProps} />)
    expect(getByText('72')).toBeTruthy()
  })

  it('shows the next-up agenda with events', () => {
    const { getByText } = render(<FluxLayout {...mockProps} />)
    expect(getByText('Next Up')).toBeTruthy()
    expect(getByText('Standup')).toBeTruthy()
  })

  it('shows the flow caption describing what drives the field', () => {
    const { getByText } = render(<FluxLayout {...mockProps} />)
    expect(getByText(/WIND NW 8 MPH/)).toBeTruthy()
  })

  it('shows now playing when a session is active', () => {
    const session = {
      title: 'Interstellar',
      type: 'movie' as const,
      subtitle: '',
      thumbPath: null,
      userName: 'gerald',
      userAvatar: null,
      viewOffset: 30000,
      duration: 60000,
      playerState: 'playing' as const,
    }
    const { getByText } = render(<FluxLayout {...mockProps} sessions={[session]} />)
    expect(getByText('Interstellar')).toBeTruthy()
  })
})
