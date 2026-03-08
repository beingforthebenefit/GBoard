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
    icon: '03d',
    sunrise: 1772871120,
    sunset: 1772914500,
  },
  forecast: [
    { date: '2026-03-08', high: 63, low: 54, description: 'cloudy', icon: '03d' },
    { date: '2026-03-09', high: 59, low: 52, description: 'cloudy', icon: '03d' },
    { date: '2026-03-10', high: 62, low: 54, description: 'cloudy', icon: '03d' },
  ],
}

describe('WeatherWidget', () => {
  it('centers the details row', () => {
    const { container } = render(<WeatherWidget data={weatherData} loading={false} />)
    const feelsText = screen.getByText(/Feels 59°/)
    const detailsRow = feelsText.closest('div')
    expect(detailsRow).toHaveClass('justify-center')
    expect(detailsRow).toHaveClass('text-center')

    // Keep one additional assertion on full class selector to ensure container shape.
    expect(
      container.querySelector('div.text-base.text-white\\/60.flex.flex-wrap.justify-center.text-center')
    ).toBeTruthy()
  })

  it('centers the sunrise/sunset row', () => {
    render(<WeatherWidget data={weatherData} loading={false} />)
    const sunrise = screen.getByText((content) => content.includes('🌅'))
    const sunRow = sunrise.closest('div')
    expect(sunRow).toHaveClass('justify-center')
    expect(sunRow).toHaveClass('text-center')
  })
})
