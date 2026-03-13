import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { RadarWidget } from '../../components/RadarWidget.js'
import { RadarData } from '../../types/index.js'

const radarData: RadarData = {
  zoom: 6,
  centerX: 17,
  centerY: 25,
  locX: 0.5,
  locY: 0.5,
  host: 'tile.openweathermap.org',
  radarPath: '/map/precipitation_new',
}

describe('RadarWidget', () => {
  it('renders loading skeleton when loading', () => {
    const { container } = render(<RadarWidget data={null} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('returns null when data is null and not loading', () => {
    const { container } = render(<RadarWidget data={null} loading={false} />)
    expect(container.innerHTML).toBe('')
  })

  it('renders a 3x3 grid of tile pairs (base + overlay)', () => {
    const { container } = render(<RadarWidget data={radarData} loading={false} />)
    const images = container.querySelectorAll('img')
    // 9 tiles x 2 images each (base + overlay)
    expect(images.length).toBe(18)
  })

  it('generates correct tile URLs for the 3x3 grid', () => {
    const { container } = render(<RadarWidget data={radarData} loading={false} />)
    const images = container.querySelectorAll('img')
    const srcs = Array.from(images).map((img) => img.getAttribute('src'))

    // Center tile base image
    expect(srcs).toContain('/api/weather/radar/base/6/17/25')
    // Center tile overlay image
    expect(srcs).toContain('/api/weather/radar/overlay/6/17/25')
    // Corner tile (top-left)
    expect(srcs).toContain('/api/weather/radar/base/6/16/24')
    expect(srcs).toContain('/api/weather/radar/overlay/6/16/24')
    // Corner tile (bottom-right)
    expect(srcs).toContain('/api/weather/radar/base/6/18/26')
    expect(srcs).toContain('/api/weather/radar/overlay/6/18/26')
  })

  it('renders the location marker dot', () => {
    const { container } = render(<RadarWidget data={radarData} loading={false} />)
    const marker = container.querySelector('.bg-blue-400\\/80')
    expect(marker).toBeTruthy()
  })

  it('positions the location marker based on locX and locY', () => {
    const data = { ...radarData, locX: 0.3, locY: 0.7 }
    const { container } = render(<RadarWidget data={data} loading={false} />)
    const marker = container.querySelector('.bg-blue-400\\/80') as HTMLElement
    expect(marker.style.left).toBe('30%')
    expect(marker.style.top).toBe('70%')
  })
})
