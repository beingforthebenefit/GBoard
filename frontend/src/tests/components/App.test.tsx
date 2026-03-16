import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'

vi.mock('../../hooks/useVersion.js', () => ({
  useVersion: () => {},
}))

vi.mock('../../hooks/useWeather.js', () => ({
  useWeather: () => ({ data: null, loading: true }),
}))

vi.mock('../../hooks/useCalendar.js', () => ({
  useCalendar: () => ({ events: [], loading: true }),
}))

vi.mock('../../hooks/usePlex.js', () => ({
  usePlex: () => ({ sessions: [], loading: true }),
}))

vi.mock('../../hooks/usePihole.js', () => ({
  usePihole: () => ({ data: null, loading: true }),
}))

vi.mock('../../hooks/usePhotos.js', () => ({
  usePhotos: () => ({ photos: [] }),
}))

vi.mock('../../hooks/useMedia.js', () => ({
  useMedia: () => ({ items: [], lastDayRemaining: 0, loading: true }),
}))

vi.mock('../../hooks/useDayNight.js', () => ({
  useDayNight: () => 'day',
}))

vi.mock('../../components/PhotoBackground.js', () => ({
  PhotoBackground: () => <div data-testid="photo-background" />,
}))

vi.mock('../../components/WeatherWidget.js', () => ({
  WeatherHeader: () => <div data-testid="weather-header" />,
  ForecastStrip: () => <div data-testid="forecast-strip" />,
}))

vi.mock('../../components/ClockWidget.js', () => ({
  ClockWidget: () => <div data-testid="clock-widget" />,
}))

vi.mock('../../components/AstroWidget.js', () => ({
  AstroWidget: () => <div data-testid="astro-widget" />,
}))

vi.mock('../../components/SoberCounter.js', () => ({
  SoberCounter: () => <div data-testid="sober-counter" />,
}))

vi.mock('../../components/MediaWidget.js', () => ({
  MediaWidget: () => <div data-testid="media-widget" />,
}))

vi.mock('../../components/PlexWidget.js', () => ({
  PlexWidget: () => <div data-testid="plex-widget" />,
}))

vi.mock('../../components/CalendarWidget.js', () => ({
  CalendarWidget: () => <div data-testid="calendar-widget" />,
}))

vi.mock('../../components/PiholeWidget.js', () => ({
  PiholeWidget: () => <div data-testid="pihole-widget" />,
}))

import { App } from '../../App.js'

describe('App', () => {
  it('renders without crashing', () => {
    const { container } = render(<App />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders all major widget sections', () => {
    const { getByTestId } = render(<App />)
    expect(getByTestId('photo-background')).toBeTruthy()
    expect(getByTestId('weather-header')).toBeTruthy()
    expect(getByTestId('forecast-strip')).toBeTruthy()
    expect(getByTestId('clock-widget')).toBeTruthy()
    expect(getByTestId('astro-widget')).toBeTruthy()
    expect(getByTestId('sober-counter')).toBeTruthy()
    expect(getByTestId('media-widget')).toBeTruthy()
    expect(getByTestId('plex-widget')).toBeTruthy()
    expect(getByTestId('calendar-widget')).toBeTruthy()
    expect(getByTestId('pihole-widget')).toBeTruthy()
  })
})
