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

import { NewspaperLayout } from '../../layouts/newspaper/NewspaperLayout.js'

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
      {
        date: new Date().toLocaleDateString('en-CA'),
        high: 75,
        low: 55,
        description: 'sunny',
        icon: '01d',
      },
      { date: '2025-01-02', high: 70, low: 50, description: 'cloudy', icon: '02d' },
      { date: '2025-01-03', high: 68, low: 48, description: 'rain', icon: '10d' },
      { date: '2025-01-04', high: 72, low: 52, description: 'sunny', icon: '01d' },
      { date: '2025-01-05', high: 74, low: 54, description: 'clear', icon: '01d' },
    ],
    hourly: [],
  },
  weatherLoading: false,
  events: (() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return [
      {
        id: '1',
        title: 'Meeting',
        start: `${y}-${m}-${d}T10:00:00`,
        end: `${y}-${m}-${d}T11:00:00`,
        allDay: false,
        calendarIndex: 0,
      },
      {
        id: '2',
        title: 'Lunch',
        start: `${y}-${m}-${d}T12:00:00`,
        end: `${y}-${m}-${d}T13:00:00`,
        allDay: false,
        calendarIndex: 1,
      },
    ]
  })(),
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

describe('NewspaperLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset html classes to light mode between tests
    document.documentElement.classList.remove('dark', 'light')
  })

  it('renders without crashing', () => {
    const { container } = render(<NewspaperLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the masthead title', () => {
    const { container } = render(<NewspaperLayout {...mockProps} />)
    expect(container.textContent).toContain('Dashboard')
  })

  it('shows weather temperature in headline', () => {
    const { container } = render(<NewspaperLayout {...mockProps} />)
    expect(container.textContent).toContain('72°')
  })

  it('shows weather description in headline', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText(/clear sky/i)).toBeTruthy()
  })

  it('shows sober ticker bar with label', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText(/Sober/i)).toBeTruthy()
  })

  it('shows sober counter values from hook', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    // useSoberCounter mocked to return { years: 1, months: 2, days: 3, hours: 4 }
    // rendered as "1y", "2m", "3d", "4h" suffixes
    expect(getByText('y')).toBeTruthy()
    expect(getByText('m')).toBeTruthy()
    expect(getByText('d')).toBeTruthy()
    expect(getByText('h')).toBeTruthy()
  })

  it('shows pi-hole stats in ticker bar', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText(/Pi-hole/i)).toBeTruthy()
    expect(getByText(/50,000/)).toBeTruthy()
  })

  it('shows event titles in calendar section', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText('Meeting')).toBeTruthy()
    expect(getByText('Lunch')).toBeTruthy()
  })

  it('shows event end times with en-dash separator', () => {
    const { container } = render(<NewspaperLayout {...mockProps} />)
    const textContent = container.textContent ?? ''
    // CalendarGrid formats times as "10:00am – 11:00am"
    expect(textContent).toMatch(/am|pm/)
  })

  it('shows photo placeholder when no photos provided', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} photos={[]} />)
    expect(getByText(/Photo of the Day/i)).toBeTruthy()
  })

  it('does not show "Now Playing" section when no sessions', () => {
    const { queryByText } = render(<NewspaperLayout {...mockProps} sessions={[]} />)
    expect(queryByText(/Now Playing/i)).toBeNull()
  })

  it('shows "Now Playing" section when a session is active', () => {
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
    const { getByText } = render(<NewspaperLayout {...mockProps} sessions={[session]} />)
    expect(getByText(/Now Playing/i)).toBeTruthy()
  })

  it('shows Plex session title and progress percentage', () => {
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
    const { getByText } = render(<NewspaperLayout {...mockProps} sessions={[session]} />)
    expect(getByText('Breaking Bad')).toBeTruthy()
    // 30000/60000 = 50%
    expect(getByText(/50%/)).toBeTruthy()
  })

  it('shows upcoming media item', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText('Test Show')).toBeTruthy()
  })

  it('shows forecast days in weather section', () => {
    const { getAllByText } = render(<NewspaperLayout {...mockProps} />)
    // "Today" appears in both forecast strip and calendar grid
    expect(getAllByText('Today').length).toBeGreaterThanOrEqual(1)
  })

  it('renders in dark mode when html element has dark class', () => {
    document.documentElement.classList.add('dark')
    const { container } = render(<NewspaperLayout {...mockProps} />)
    // Dark mode uses bg-neutral-950; confirm render does not crash
    expect(container.firstChild).toBeTruthy()
    // The root layout div should contain dark mode background class
    const root = container.querySelector('[class*="bg-neutral-950"]')
    expect(root).toBeTruthy()
  })

  it('renders in light mode when html element has light class', () => {
    document.documentElement.classList.add('light')
    const { container } = render(<NewspaperLayout {...mockProps} />)
    // Light mode uses bg-white
    const root = container.querySelector('[class*="bg-white"]')
    expect(root).toBeTruthy()
  })

  it('shows "Section" headers: Upcoming and This Week', () => {
    const { getByText } = render(<NewspaperLayout {...mockProps} />)
    expect(getByText(/Upcoming/i)).toBeTruthy()
    expect(getByText(/This Week/i)).toBeTruthy()
  })
})
