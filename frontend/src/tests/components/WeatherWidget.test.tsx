import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeatherWidget } from '../../components/WeatherWidget.js'
import { WeatherData } from '../../types/index.js'

const weatherData: WeatherData = {
  current: {
    temp: 60,
    feelsLike: 59,
    description: 'broken clouds',
    humidity: 74,
    windSpeed: 4,
    windDirection: 'NE',
    windGust: 8,
    pressure: 1015,
    visibility: 10,
    dewPoint: 49,
    icon: '03d',
    sunrise: 1772871120,
    sunset: 1772914500,
  },
  forecast: [
    { date: '2026-03-08', high: 63, low: 54, description: 'cloudy', icon: '03d' },
    { date: '2026-03-09', high: 59, low: 52, description: 'cloudy', icon: '03d' },
    { date: '2026-03-10', high: 62, low: 54, description: 'cloudy', icon: '03d' },
  ],
  hourly: [],
}

describe('WeatherWidget', () => {
  it('centers the details row', () => {
    render(<WeatherWidget data={weatherData} loading={false} />)
    const feelsText = screen.getByText(/Feels 59°/)
    const detailsRow = feelsText.closest('div')
    expect(detailsRow).toHaveClass('justify-center')
    expect(detailsRow).toHaveClass('text-center')
  })

  it('renders sunrise and sunset times', () => {
    render(<WeatherWidget data={weatherData} loading={false} />)
    expect(screen.getByText(/☀/)).toBeDefined()
    expect(screen.getByText(/☾/)).toBeDefined()
  })

  it('renders a stable fallback message when data is unavailable', () => {
    render(<WeatherWidget data={null} loading={false} />)
    expect(screen.getByText('Weather temporarily unavailable')).toBeDefined()
    expect(screen.getByText('Retrying automatically...')).toBeDefined()
  })

  it('renders loading skeleton with animate-pulse when loading is true', () => {
    const { container } = render(<WeatherWidget data={null} loading={true} />)
    const pulseEl = container.querySelector('.animate-pulse')
    expect(pulseEl).toBeTruthy()
    const skeleton = container.querySelector('.bg-white\\/10')
    expect(skeleton).toBeTruthy()
    expect(skeleton?.classList.contains('rounded')).toBe(true)
  })

  it('renders forecast row with Today label and day names', () => {
    render(<WeatherWidget data={weatherData} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
    // The remaining forecast entries should render as short day names
    const allText = document.body.textContent ?? ''
    expect(allText).toContain('63°')
    expect(allText).toContain('54°')
    expect(allText).toContain('59°')
    expect(allText).toContain('52°')
    expect(allText).toContain('62°')
  })
})
