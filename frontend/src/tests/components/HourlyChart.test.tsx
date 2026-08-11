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
      // pop is a whole percent (0–100), matching what the backend serves
      pop: i % 2 === 0 ? 40 : 0,
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

  it('labels every vertex, since the chart has no y-axis to read values off', () => {
    const { container } = render(<HourlyChart data={makeData(8)} loading={false} />)
    const labels = Array.from(container.querySelectorAll('text'))
      .map((t) => t.textContent ?? '')
      .filter((t) => t.endsWith('\u00b0'))
    expect(labels).toEqual([
      '60\u00b0',
      '61\u00b0',
      '62\u00b0',
      '63\u00b0',
      '64\u00b0',
      '65\u00b0',
      '66\u00b0',
      '67\u00b0',
    ])
    expect(container.querySelectorAll('circle').length).toBe(8)
  })

  it('keeps every label inside the chart, including the warmest point', () => {
    const data = makeData(6)
    data.hourly = data.hourly.map((h, i) => ({ ...h, temp: i === 3 ? 99 : 50 }))
    const { container } = render(<HourlyChart data={data} loading={false} />)
    const viewBoxHeight = Number(
      container.querySelector('svg')!.getAttribute('viewBox')!.split(' ')[3]
    )
    for (const text of Array.from(container.querySelectorAll('text'))) {
      const y = Number(text.getAttribute('y'))
      expect(y).toBeGreaterThan(0)
      expect(y).toBeLessThanOrEqual(viewBoxHeight)
    }
  })

  it('renders precipitation bars for hours with pop', () => {
    const { container } = render(<HourlyChart data={makeData(12)} loading={false} />)
    expect(container.querySelectorAll('rect').length).toBe(6)
  })

  it('scales precipitation bars as a percentage so they stay inside the chart', () => {
    // Treating pop as a 0–1 fraction made a 40% bar 40x too tall, overflowing the viewBox
    const data = makeData(4)
    data.hourly = data.hourly.map((h) => ({ ...h, pop: 100 }))
    const { container } = render(<HourlyChart data={data} loading={false} />)
    const viewBoxHeight = Number(
      container.querySelector('svg')!.getAttribute('viewBox')!.split(' ')[3]
    )
    for (const rect of Array.from(container.querySelectorAll('rect'))) {
      const y = Number(rect.getAttribute('y'))
      const height = Number(rect.getAttribute('height'))
      expect(y).toBeGreaterThanOrEqual(0)
      expect(y + height).toBeLessThanOrEqual(viewBoxHeight)
    }
  })

  it('hides the bar when precipitation is negligible', () => {
    const data = makeData(4)
    data.hourly = data.hourly.map((h) => ({ ...h, pop: 2 }))
    const { container } = render(<HourlyChart data={data} loading={false} />)
    expect(container.querySelectorAll('rect').length).toBe(0)
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
