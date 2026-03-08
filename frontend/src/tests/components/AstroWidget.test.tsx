import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { AstroWidget } from '../../components/AstroWidget.js'

describe('AstroWidget', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-07T20:30:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders the current sign, range, and day ruler details', () => {
    render(<AstroWidget />)

    expect(screen.getByText('Cosmic Snapshot')).toBeDefined()
    expect(screen.getAllByText('Pisces').length).toBeGreaterThan(0)
    expect(screen.getByText('Feb 19 - Mar 20')).toBeDefined()
    expect(screen.getByText(/Saturday · Saturn/)).toBeDefined()
  })

  it('shows moon and guidance details', () => {
    render(<AstroWidget />)

    expect(screen.getByText('Constellation')).toBeDefined()
    expect(screen.getByText('Notable star: Alrescha')).toBeDefined()
    expect(screen.getByText(/Moon illumination:/)).toBeDefined()
    expect(screen.getByText(/Lucky/)).toBeDefined()
    expect(screen.getByText(/Saturday is ruled by Saturn/)).toBeDefined()
  })
})
