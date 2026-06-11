import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { DeparturesLayout } from '../../layouts/departures/DeparturesLayout.js'
import { buildBoardRows } from '../../layouts/departures/boardRows.js'
import { CalendarEvent, PlexSession } from '../../types/index.js'

function eventAt(id: string, title: string, hoursFromNow: number): CalendarEvent {
  const start = new Date(Date.now() + hoursFromNow * 3600_000)
  const end = new Date(start.getTime() + 3600_000)
  return { id, title, start: start.toISOString(), end: end.toISOString(), allDay: false }
}

const session: PlexSession = {
  title: 'Breaking Bad',
  type: 'episode',
  subtitle: 'S01E01',
  thumbPath: null,
  userName: 'gerald',
  userAvatar: null,
  viewOffset: 30000,
  duration: 60000,
  playerState: 'playing',
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
      { date: '2025-01-04', high: 72, low: 52, description: 'sunny', icon: '01d' },
      { date: '2025-01-05', high: 74, low: 54, description: 'clear', icon: '01d' },
    ],
    hourly: [],
  },
  weatherLoading: false,
  events: [eventAt('1', 'Dentist', 26), eventAt('2', 'Meeting', 2)],
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

describe('buildBoardRows', () => {
  const now = new Date('2026-06-09T08:00:00')

  it('puts active Plex sessions first with IN FLIGHT status', () => {
    const rows = buildBoardRows([], [], [session], now)
    expect(rows[0].time).toBe('NOW')
    expect(rows[0].status).toBe('IN FLIGHT')
    expect(rows[0].detail).toContain('50%')
  })

  it('marks imminent events as BOARDING', () => {
    const soon: CalendarEvent = {
      id: '1',
      title: 'Soon',
      start: '2026-06-09T08:30:00',
      end: '2026-06-09T09:30:00',
      allDay: false,
    }
    const rows = buildBoardRows([soon], [], [], now)
    expect(rows[0].status).toBe('BOARDING')
  })

  it('marks in-progress events as DEPARTED and drops ended ones', () => {
    const inProgress: CalendarEvent = {
      id: '1',
      title: 'Started',
      start: '2026-06-09T07:30:00',
      end: '2026-06-09T09:00:00',
      allDay: false,
    }
    const ended: CalendarEvent = {
      id: '2',
      title: 'Done',
      start: '2026-06-09T05:00:00',
      end: '2026-06-09T06:00:00',
      allDay: false,
    }
    const rows = buildBoardRows([inProgress, ended], [], [], now)
    expect(rows.length).toBe(1)
    expect(rows[0].status).toBe('DEPARTED')
  })

  it('schedules future media and sorts chronologically', () => {
    const rows = buildBoardRows(
      [
        {
          id: '1',
          title: 'Meeting',
          start: '2026-06-09T10:00:00',
          end: '2026-06-09T11:00:00',
          allDay: false,
        },
      ],
      [{ title: 'Movie Night', subtitle: '', date: '2026-06-08', type: 'movie' as const }],
      [],
      now
    )
    expect(rows[0].title).toBe('MOVIE NIGHT')
    expect(rows[0].status).toBe('SCHEDULED')
    expect(rows[1].title).toBe('MEETING')
  })

  it('uses weekday labels for media within the next week', () => {
    const rows = buildBoardRows(
      [],
      [
        { title: 'Near Show', subtitle: '', date: '2026-06-12', type: 'episode' as const },
        { title: 'Far Show', subtitle: '', date: '2026-06-30', type: 'episode' as const },
      ],
      [],
      now
    )
    expect(rows[0].time).toBe('FRI')
    expect(rows[1].time).toBe('JUN 30')
  })

  it('keeps emoji-only event titles as printed flap symbols', () => {
    const rows = buildBoardRows(
      [
        {
          id: '1',
          title: '🚮',
          start: '2026-06-09T10:00:00',
          end: '2026-06-09T11:00:00',
          allDay: false,
        },
      ],
      [],
      [],
      now
    )
    expect(rows[0].title).toBe('🚮')
  })

  it('falls back to a placeholder when a title sanitizes to nothing', () => {
    const rows = buildBoardRows(
      [
        {
          id: '1',
          title: '\u200b\u200b',
          start: '2026-06-09T10:00:00',
          end: '2026-06-09T11:00:00',
          allDay: false,
        },
      ],
      [],
      [],
      now
    )
    expect(rows[0].title).toBe('- - -')
  })
})

describe('DeparturesLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<DeparturesLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows the masthead and streak', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} />)
    expect(getByText(/GBoard Intl · Departures/)).toBeTruthy()
    expect(getByText(/STREAK: DAY/)).toBeTruthy()
  })

  it('shows field conditions', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} />)
    expect(getByText('72°F')).toBeTruthy()
    expect(getByText(/WIND NW 5MPH/)).toBeTruthy()
  })

  it('lists calendar events on the board', () => {
    const { container } = render(<DeparturesLayout {...mockProps} />)
    expect(container.textContent).toContain('MEETING')
    expect(container.textContent).toContain('DENTIST')
  })

  it('lists upcoming media on the board', () => {
    const { container } = render(<DeparturesLayout {...mockProps} />)
    expect(container.textContent).toContain('TEST SHOW')
  })

  it('shows Plex sessions as in-flight', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} sessions={[session]} />)
    expect(getByText('IN FLIGHT')).toBeTruthy()
  })

  it('shows the security footer', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} />)
    expect(getByText(/50,000 PROCESSED/)).toBeTruthy()
    expect(getByText(/CHECKPOINT ACTIVE/)).toBeTruthy()
  })

  it('shows the observation deck slideshow section', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} />)
    expect(getByText(/Observation Deck/i)).toBeTruthy()
  })

  it('shows a no-signal placeholder when there are no photos', () => {
    const { getByText } = render(<DeparturesLayout {...mockProps} photos={[]} />)
    expect(getByText(/NO SIGNAL/)).toBeTruthy()
  })

  it('renders the slideshow when photos exist', () => {
    const photos = [{ filename: 'a.jpg' }, { filename: 'b.jpg' }]
    const { queryByText } = render(<DeparturesLayout {...mockProps} photos={photos} />)
    expect(queryByText(/NO SIGNAL/)).toBeNull()
  })

  it('handles missing weather and pihole data', () => {
    const { getByText } = render(
      <DeparturesLayout
        {...mockProps}
        weatherData={null}
        weatherLoading={false}
        piholeData={null}
      />
    )
    expect(getByText(/FIELD CONDITIONS UNAVAILABLE/)).toBeTruthy()
    expect(getByText(/SECURITY SCREENING OFFLINE/)).toBeTruthy()
  })
})
