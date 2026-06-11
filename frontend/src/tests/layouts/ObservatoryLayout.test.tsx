import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

import { ObservatoryLayout } from '../../layouts/observatory/ObservatoryLayout.js'

const baseTime = 1700000000

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
      windGust: 12,
      sunrise: baseTime,
      sunset: baseTime + 36000,
      dewPoint: 55,
      pressure: 1013,
      visibility: 10,
    },
    forecast: [
      { date: '2025-01-01', high: 75, low: 55, description: 'sunny', icon: '01d' },
      { date: '2025-01-02', high: 70, low: 50, description: 'cloudy', icon: '02d' },
    ],
    hourly: Array.from({ length: 12 }, (_, i) => ({
      time: baseTime + i * 3600,
      temp: 60 + i,
      icon: '01d',
      pop: i > 8 ? 0.5 : 0,
    })),
  },
  weatherLoading: false,
  events: [],
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

describe('ObservatoryLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<ObservatoryLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows the masthead with the mission clock', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText('The Observatory')).toBeTruthy()
    expect(getByText(/MISSION CLOCK · 1Y 2M 3D CLEAR SKIES/)).toBeTruthy()
  })

  it('shows the instrument panels', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText('Lunar Phase')).toBeTruthy()
    expect(getByText('Wind')).toBeTruthy()
    expect(getByText(/Sun Views/)).toBeTruthy()
  })

  it('shows the hourly chart panel with current conditions in the title', () => {
    const { getByText, container } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText(/Next 12 Hours · 72° clear sky/)).toBeTruthy()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('shows wind speed and gust', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText(/5 mph NW/)).toBeTruthy()
  })

  it('lists upcoming media in the ephemeris', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText('Ephemeris')).toBeTruthy()
    expect(getByText('Test Show')).toBeTruthy()
  })

  it('shows pi-hole telemetry', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} />)
    expect(getByText(/SHIELD UP · 50,000 SIGNALS · 15.2% DEFLECTED/)).toBeTruthy()
  })

  it('shows tracking lines for Plex sessions', () => {
    const session = {
      title: 'Dune',
      type: 'movie' as const,
      subtitle: '',
      thumbPath: null,
      userName: 'gerald',
      userAvatar: null,
      viewOffset: 30000,
      duration: 60000,
      playerState: 'playing' as const,
    }
    const { getByText } = render(<ObservatoryLayout {...mockProps} sessions={[session]} />)
    expect(getByText(/TRACKING "DUNE" · GERALD · 50%/)).toBeTruthy()
  })

  it('shows nominal status when idle with no pihole data', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} piholeData={null} />)
    expect(getByText(/ALL INSTRUMENTS NOMINAL/)).toBeTruthy()
  })

  it('shows the empty ephemeris message', () => {
    const { getByText } = render(<ObservatoryLayout {...mockProps} mediaItems={[]} />)
    expect(getByText(/Nothing on the horizon/)).toBeTruthy()
  })
})
