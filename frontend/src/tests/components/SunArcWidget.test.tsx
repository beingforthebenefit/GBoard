import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SunArcWidget } from '../../components/SunArcWidget.js'

describe('SunArcWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-08T18:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a loading skeleton when loading', () => {
    const { container } = render(<SunArcWidget sunrise={null} sunset={null} loading={true} />)
    expect(container.querySelector('.animate-pulse')).toBeTruthy()
  })

  it('renders fallback when sun data is unavailable', () => {
    render(<SunArcWidget sunrise={null} sunset={null} loading={false} />)
    expect(screen.getByText('Sun data unavailable')).toBeDefined()
  })

  it('renders the sun arc with sunrise and sunset labels', () => {
    const sunrise = Math.floor(Date.parse('2026-03-08T13:00:00Z') / 1000)
    const sunset = Math.floor(Date.parse('2026-03-09T01:00:00Z') / 1000)
    const { container } = render(<SunArcWidget sunrise={sunrise} sunset={sunset} loading={false} />)

    expect(screen.getByText('Sun Views')).toBeDefined()
    expect(screen.getByText('Horizon Track')).toBeDefined()
    expect(screen.getByText('Orbital Earth View')).toBeDefined()
    expect(screen.getByText((text) => text.includes('🌅'))).toBeDefined()
    expect(screen.getByText((text) => text.includes('🌇'))).toBeDefined()
    expect(container.querySelectorAll('svg').length).toBe(2)
  })
})
