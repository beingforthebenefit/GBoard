import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { WeatherHeader, ForecastStrip } from '../../components/WeatherWidget.js'
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
    {
      date: new Date().toLocaleDateString('en-CA'),
      high: 63,
      low: 54,
      description: 'cloudy',
      icon: '03d',
    },
    { date: '2026-03-09', high: 59, low: 52, description: 'cloudy', icon: '03d' },
    { date: '2026-03-10', high: 62, low: 54, description: 'cloudy', icon: '03d' },
  ],
  hourly: [],
}

describe('WeatherHeader', () => {
  it('renders temperature', () => {
    render(<WeatherHeader data={weatherData} loading={false} />)
    expect(screen.getByText('60')).toBeDefined()
  })

  it('renders description', () => {
    render(<WeatherHeader data={weatherData} loading={false} />)
    expect(screen.getByText('broken clouds')).toBeDefined()
  })

  it('renders feels-like detail', () => {
    render(<WeatherHeader data={weatherData} loading={false} />)
    expect(screen.getByText(/Feels 59°/)).toBeDefined()
  })

  it('renders dash when loading', () => {
    render(<WeatherHeader data={null} loading={true} />)
    expect(screen.getByText('—°')).toBeDefined()
  })
})

describe('ForecastStrip', () => {
  it('renders forecast cards with Today label', () => {
    render(<ForecastStrip data={weatherData} loading={false} />)
    expect(screen.getByText('Today')).toBeDefined()
  })

  it('renders high and low temperatures', () => {
    render(<ForecastStrip data={weatherData} loading={false} />)
    const allText = document.body.textContent ?? ''
    expect(allText).toContain('63°')
    expect(allText).toContain('54°')
  })

  it('renders loading placeholders when loading', () => {
    const { container } = render(<ForecastStrip data={null} loading={true} />)
    const cards = container.querySelectorAll('.animate-pulse')
    expect(cards.length).toBe(6)
  })
})
