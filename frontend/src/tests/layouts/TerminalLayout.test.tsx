import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

// ── Mock internal hooks and utils ──

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T14:30:00'),
}))

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

vi.mock('../../utils/astrology.js', () => ({
  getAstrologySnapshot: () => ({
    sign: {
      name: 'Capricorn',
      glyph: '♑',
      element: 'Earth',
      modality: 'Cardinal',
      traits: 'Ambitious',
    },
    signRange: 'Dec 22 – Jan 19',
    moon: { name: 'Waxing Gibbous', emoji: '🌔', illumination: 72 },
    weekday: { dayName: 'Wednesday', ruler: 'Mercury' },
    luckyWindow: '2pm–4pm',
    message: 'Stay grounded today.',
    constellation: {
      name: 'Capricornus',
      notable: 'Deneb Algedi',
      stars: [{ x: 50, y: 30, size: 2 }],
      lines: [],
    },
  }),
}))

import { TerminalLayout } from '../../layouts/terminal/TerminalLayout.js'

// ── Shared mock props ──

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
      { date: '2025-01-04', high: 72, low: 52, description: 'sunny', icon: '01d' },
      { date: '2025-01-05', high: 74, low: 54, description: 'clear', icon: '01d' },
    ],
    hourly: [],
  },
  weatherLoading: false,
  events: [
    {
      id: '1',
      title: 'Meeting',
      start: '2025-01-01T10:00:00',
      end: '2099-01-01T11:00:00',
      allDay: false,
      calendarIndex: 0,
    },
    {
      id: '2',
      title: 'Lunch',
      start: '2025-01-01T12:00:00',
      end: '2099-01-01T13:00:00',
      allDay: false,
      calendarIndex: 1,
    },
  ],
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
    clients: [
      {
        ip: '192.168.1.1',
        name: 'Phone',
        queries: 1000,
        blockedQueries: 150,
        blockedPercentage: 15,
      },
    ],
  },
  piholeLoading: false,
  photos: [],
  mediaItems: [
    { title: 'Test Show', subtitle: 'S01E01', date: '2025-01-02', type: 'episode' as const },
  ],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  sobrietyDate: '2024-01-01T00:00:00',
}

describe('TerminalLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    const { container } = render(<TerminalLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows clock time', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    // useClock returns 2:30:00 PM
    expect(getByText(/2:30:00 PM/i)).toBeTruthy()
  })

  it('shows weather temperature when weather data is provided', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/72°F/)).toBeTruthy()
  })

  it('shows weather description when weather data is provided', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/clear sky/i)).toBeTruthy()
  })

  it('shows "nothing playing" when no Plex sessions', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} sessions={[]} />)
    expect(getByText(/nothing playing/i)).toBeTruthy()
  })

  it('shows Plex session title when a session is provided', () => {
    const session = {
      title: 'Breaking Bad',
      type: 'episode' as const,
      subtitle: 'S01E01',
      thumbPath: null,
      userName: 'gerald',
      userAvatar: null,
      viewOffset: 30000,
      duration: 60000,
      playerState: 'playing' as const,
    }
    const { getByText } = render(<TerminalLayout {...mockProps} sessions={[session]} />)
    expect(getByText(/Breaking Bad/)).toBeTruthy()
  })

  it('shows sober counter values', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    // useSoberCounter mocked to return { years: 1, months: 2, days: 3, hours: 4 }
    expect(getByText('1')).toBeTruthy()
    expect(getByText('YR')).toBeTruthy()
    expect(getByText('MO')).toBeTruthy()
  })

  it('shows photo placeholder text when no photos provided', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} photos={[]} />)
    expect(getByText(/PHOTO FEED/i)).toBeTruthy()
  })

  it('shows pi-hole query count', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/50,000/)).toBeTruthy()
  })

  it('shows pi-hole blocked percentage', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/15.2%/)).toBeTruthy()
  })

  it('shows pi-hole status as ON when enabled', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/● ON/)).toBeTruthy()
  })

  it('shows footer with gboard version text', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/gboard v2\.0/i)).toBeTruthy()
  })

  it('shows "loading..." when weather is loading', () => {
    const { getAllByText } = render(
      <TerminalLayout {...mockProps} weatherData={null} weatherLoading={true} />
    )
    // Multiple "loading..." spans may appear across sections
    expect(getAllByText(/loading\.\.\./i).length).toBeGreaterThan(0)
  })

  it('shows "unavailable" when weather data is null and not loading', () => {
    const { getByText } = render(
      <TerminalLayout {...mockProps} weatherData={null} weatherLoading={false} />
    )
    expect(getByText(/unavailable/i)).toBeTruthy()
  })

  it('shows the header bar with gerald@gboard prompt', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/gerald@gboard/)).toBeTruthy()
  })

  it('shows upcoming media item title', () => {
    const { getByText } = render(<TerminalLayout {...mockProps} />)
    expect(getByText(/Test Show/)).toBeTruthy()
  })
})
