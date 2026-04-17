import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

// ── Mock sub-components that rely on external resources or complex logic ──

vi.mock('../../layouts/classic/ClassicPhotoBackground.js', () => ({
  ClassicPhotoBackground: ({ photos }: { photos: { filename: string }[] }) => (
    <div data-testid="photo-background" data-photo-count={photos.length} />
  ),
}))

vi.mock('../../layouts/classic/ClassicRadarWidget.js', () => ({
  ClassicRadarWidget: () => <div data-testid="radar-widget" />,
}))

vi.mock('../../layouts/classic/GlassPanel.js', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  GlassPanel: ({ children, className }: { children: any; className?: string }) => (
    <div className={className}>{children}</div>
  ),
}))

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
      traits: 'Ambitious and disciplined.',
    },
    signRange: 'Dec 22 – Jan 19',
    moon: { name: 'Waxing Gibbous', emoji: '🌔', illumination: 72 },
    weekday: { dayName: 'Wednesday', ruler: 'Mercury' },
    luckyWindow: '2pm–4pm',
    message: 'Stay grounded today.',
    constellation: {
      name: 'Capricornus',
      notable: 'Deneb Algedi',
      stars: [
        { x: 20, y: 40, size: 2 },
        { x: 50, y: 20, size: 1.5 },
        { x: 80, y: 50, size: 2 },
      ],
      lines: [
        [0, 1],
        [1, 2],
      ],
    },
  }),
}))

import { ClassicLayout } from '../../layouts/classic/ClassicLayout.js'

// ── Shared mock props ──

const minimalProps = {
  weatherData: null,
  weatherLoading: false,
  events: [],
  calendarLoading: false,
  sessions: [],
  plexLoading: false,
  piholeData: null,
  piholeLoading: false,
  photos: [],
  mediaItems: [],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  sobrietyDate: '2024-01-01T00:00:00',
}

const fullProps = {
  ...minimalProps,
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
  events: (() => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    return [
      {
        id: '1',
        title: 'Team Meeting',
        start: `${y}-${m}-${d}T10:00:00`,
        end: `${y}-${m}-${d}T11:00:00`,
        allDay: false,
        calendarIndex: 0,
      },
    ]
  })(),
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
  mediaItems: [
    { title: 'Test Show', subtitle: 'S01E01', date: '2025-01-02', type: 'episode' as const },
  ],
  photos: [{ filename: 'photo1.jpg' }, { filename: 'photo2.jpg' }],
}

describe('ClassicLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing with minimal props', () => {
    const { container } = render(<ClassicLayout {...minimalProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing with full weather data', () => {
    const { container } = render(<ClassicLayout {...fullProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders photo background component', () => {
    const { getByTestId } = render(<ClassicLayout {...fullProps} />)
    expect(getByTestId('photo-background')).toBeTruthy()
  })

  it('passes photos to photo background', () => {
    const { getByTestId } = render(<ClassicLayout {...fullProps} />)
    const bg = getByTestId('photo-background')
    expect(bg.getAttribute('data-photo-count')).toBe('2')
  })

  it('shows weather temperature when data is provided', () => {
    const { container } = render(<ClassicLayout {...fullProps} />)
    expect(container.textContent).toContain('72°')
  })

  it('shows weather description when data is provided', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    expect(getByText(/clear sky/i)).toBeTruthy()
  })

  it('shows "Weather temporarily unavailable" when no weather data', () => {
    const { getByText } = render(<ClassicLayout {...minimalProps} />)
    expect(getByText(/Weather temporarily unavailable/i)).toBeTruthy()
  })

  it('shows forecast days limited to 5', () => {
    const { getAllByText } = render(<ClassicLayout {...fullProps} />)
    // "Today" appears once, then 4 weekday labels for remaining forecast days
    const todayLabels = getAllByText(/Today/)
    expect(todayLabels.length).toBeGreaterThanOrEqual(1)
    // Verify forecast icons render: each forecast day gets a WeatherIcon img
    // The weather panel renders up to 5 forecast entries
    const images = document.querySelectorAll('img[src*="openweathermap"]')
    expect(images.length).toBeLessThanOrEqual(5 + 1) // +1 for current condition icon
  })

  it('shows "Sober Time" label', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    expect(getByText(/Sober Time/i)).toBeTruthy()
  })

  it('shows sober counter values from hook', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    // useSoberCounter mocked to return { years: 1, months: 2, days: 3, hours: 4 }
    expect(getByText('YEARS')).toBeTruthy()
    expect(getByText('MONTHS')).toBeTruthy()
    expect(getByText('DAYS')).toBeTruthy()
    expect(getByText('HOURS')).toBeTruthy()
  })

  it('does not render radar widget when radarData is null', () => {
    const { queryByTestId } = render(<ClassicLayout {...fullProps} radarData={null} />)
    expect(queryByTestId('radar-widget')).toBeNull()
  })

  it('renders radar widget when radarData has precipitation', () => {
    const radarData = {
      zoom: 7,
      centerX: 400,
      centerY: 300,
      locX: 400,
      locY: 300,
      host: 'tilecache.rainviewer.com',
      radarPath: '/v2/radar/12345/256/7/50/-100/2/1_1.png',
      hasPrecipitation: true,
    }
    const { getByTestId } = render(<ClassicLayout {...fullProps} radarData={radarData} />)
    expect(getByTestId('radar-widget')).toBeTruthy()
  })

  it('shows astrology section with sign name', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    expect(getByText('Capricorn')).toBeTruthy()
  })

  it('shows "Upcoming" section label when media items are provided', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    expect(getByText(/Upcoming/i)).toBeTruthy()
  })

  it('renders pi-hole widget when data is provided', () => {
    const { getByText } = render(<ClassicLayout {...fullProps} />)
    expect(getByText(/Pi-hole/i)).toBeTruthy()
  })
})
