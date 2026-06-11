import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FridgeLayout } from '../../layouts/fridge/FridgeLayout.js'
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
      windSpeed: 5,
      windDirection: 'NW',
      windGust: null,
      sunrise: 1700000000,
      sunset: 1700040000,
      dewPoint: 55,
      pressure: 1013,
      visibility: 10,
    },
    forecast: [
      { date: '2025-01-01', high: 75, low: 55, description: 'sunny', icon: '01d' },
      { date: '2025-01-02', high: 70, low: 50, description: 'cloudy', icon: '02d' },
      { date: '2025-01-03', high: 68, low: 48, description: 'rain', icon: '10d' },
      { date: '2025-01-04', high: 73, low: 52, description: 'sunny', icon: '01d' },
    ],
    hourly: [],
  },
  weatherLoading: false,
  events: [eventAt('1', 'Soccer practice', 4)],
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
  mediaItems: [
    { title: 'Test Show', subtitle: 'S01E01', date: '2030-06-15', type: 'episode' as const },
  ],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  radarMode: 'adaptive' as const,
  sobrietyDate: '2024-01-01T00:00:00',
}

describe('FridgeLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<FridgeLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows the current temperature magnet', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText('72°')).toBeTruthy()
  })

  it('shows calendar events as sticky notes', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText('Soccer practice')).toBeTruthy()
  })

  it('shows the star chart milestone widget', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText(/Star chart/)).toBeTruthy()
    expect(getByText(/days strong/)).toBeTruthy()
  })

  it('shows the TV guide scrap with upcoming media', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText(/Coming to the couch/)).toBeTruthy()
    expect(getByText(/Test Show/)).toBeTruthy()
  })

  it('shows house notes with pi-hole stats', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText(/House notes/)).toBeTruthy()
    expect(getByText(/blocked 15% of 50,000 lookups/)).toBeTruthy()
  })

  it('shows a quiet TV message when nothing is playing', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText(/TV is quiet right now/)).toBeTruthy()
  })

  it('shows who is watching when a session is active', () => {
    const session = {
      title: 'Bluey',
      type: 'episode' as const,
      subtitle: 'S01E01',
      thumbPath: null,
      userName: 'gerald',
      userAvatar: null,
      viewOffset: 30000,
      duration: 60000,
      playerState: 'playing' as const,
    }
    const { getByText } = render(<FridgeLayout {...mockProps} sessions={[session]} />)
    expect(getByText(/gerald is watching Bluey/)).toBeTruthy()
  })

  it('shows a placeholder polaroid when there are no photos', () => {
    const { getByText } = render(<FridgeLayout {...mockProps} />)
    expect(getByText(/photos coming soon/)).toBeTruthy()
  })
})
