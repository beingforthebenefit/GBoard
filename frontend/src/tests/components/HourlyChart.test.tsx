import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { HourlyChart } from '../../components/HourlyChart.js'
import { WeatherData } from '../../types/index.js'

const baseTime = 1700000000

function makeData(hours: number): WeatherData {
  return {
    current: {
      temp: 72,
      feelsLike: 70,
      description: 'clear sky',
      icon: '01d',
      humidity: 45,
      windSpeed: 5,
      windDirection: 'NW',
      windGust: null,
      pressure: 1013,
      visibility: 10,
      dewPoint: 55,
      sunrise: baseTime,
      sunset: baseTime + 36000,
    },
    forecast: [],
    hourly: Array.from({ length: hours }, (_, i) => ({
      time: baseTime + i * 3600,
      temp: 60 + i,
      icon: '01d',
      pop: i % 2 === 0 ? 0.4 : 0,
    })),
  }
}

describe('HourlyChart', () => {
  it('renders an svg with temperature labels', () => {
    const { container, getByText } = render(<HourlyChart data={makeData(12)} loading={false} />)
    expect(container.querySelector('svg')).toBeTruthy()
    // First point (60°) and last point (71°) are labeled
    expect(getByText('60°')).toBeTruthy()
    expect(getByText('71°')).toBeTruthy()
  })

  it('renders precipitation bars for hours with pop', () => {
    const { container } = render(<HourlyChart data={makeData(12)} loading={false} />)
    expect(container.querySelectorAll('rect').length).toBe(6)
  })

  it('respects the hours limit', () => {
    const { container } = render(<HourlyChart data={makeData(24)} loading={false} hours={6} />)
    // 6 points → pop bars on even indexes 0, 2, 4
    expect(container.querySelectorAll('rect').length).toBe(3)
  })

  it('shows loading state', () => {
    const { getByText } = render(<HourlyChart data={null} loading={true} />)
    expect(getByText(/Loading hourly/)).toBeTruthy()
  })

  it('shows unavailable when there is no hourly data', () => {
    const { getByText } = render(<HourlyChart data={makeData(0)} loading={false} />)
    expect(getByText(/unavailable/i)).toBeTruthy()
  })

  it('handles a flat temperature series without dividing by zero', () => {
    const data = makeData(6)
    data.hourly = data.hourly.map((h) => ({ ...h, temp: 65 }))
    const { container } = render(<HourlyChart data={data} loading={false} />)
    expect(container.querySelector('path')).toBeTruthy()
    expect(container.innerHTML).not.toContain('NaN')
  })
})
