import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useClock.js', () => ({
  useClock: () => new Date('2025-01-01T14:30:00'),
}))

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

import { BambooLayout } from '../../layouts/bamboo/BambooLayout.js'
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
  piholeData: null,
  piholeLoading: false,
  photos: [],
  mediaItems: [],
  mediaLoading: false,
  radarData: null,
  radarLoading: false,
  radarMode: 'adaptive' as const,
  sobrietyDate: '2024-01-01T00:00:00',
  wordOfDay: null,
  wordLoading: false,
  haData: null,
  haLoading: false,
}

describe('BambooLayout', () => {
  it('renders without crashing', () => {
    const { container } = render(<BambooLayout {...mockProps} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders the swaying canvas behind the widgets', () => {
    const { container } = render(<BambooLayout {...mockProps} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })

  it('shows the clock time', () => {
    const { getByText } = render(<BambooLayout {...mockProps} />)
    expect(getByText('2:30')).toBeTruthy()
  })

  it('shows a compact sober line under the clock', () => {
    const { getByText } = render(<BambooLayout {...mockProps} />)
    expect(getByText(/Sober 1y 2m 3d/)).toBeTruthy()
  })

  it('shows the weather temperature', () => {
    const { getByText } = render(<BambooLayout {...mockProps} />)
    expect(getByText('72')).toBeTruthy()
  })

  it('shows the next-up agenda with events', () => {
    const { getByText } = render(<BambooLayout {...mockProps} />)
    expect(getByText('Next Up')).toBeTruthy()
    expect(getByText('Standup')).toBeTruthy()
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
    const { getByText } = render(<BambooLayout {...mockProps} sessions={[session]} />)
    expect(getByText('Interstellar')).toBeTruthy()
  })

  it('shows the Spanish word of the day when provided', () => {
    const wordOfDay = {
      word: 'órale',
      partOfSpeech: 'interjection' as const,
      definition: 'whoa; okay, let’s go',
      example: '¡Órale!',
      exampleTranslation: 'Come on!',
      date: '2026-06-14',
    }
    const { getByText } = render(<BambooLayout {...mockProps} wordOfDay={wordOfDay} />)
    expect(getByText('Palabra del Día')).toBeTruthy()
    expect(getByText('órale')).toBeTruthy()
  })
})
