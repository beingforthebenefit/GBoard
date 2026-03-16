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

  it('renders the current sign name', () => {
    render(<AstroWidget />)
    expect(screen.getAllByText('Pisces').length).toBeGreaterThan(0)
  })

  it('renders sign range and moon phase', () => {
    render(<AstroWidget />)
    expect(screen.getByText(/Feb 19/)).toBeDefined()
    expect(screen.getByText(/Mar 20/)).toBeDefined()
  })

  it('renders day and element tags', () => {
    render(<AstroWidget />)
    expect(screen.getByText('Saturday')).toBeDefined()
    expect(screen.getByText('Water · Mutable')).toBeDefined()
  })

  it('renders a lucky time tag', () => {
    render(<AstroWidget />)
    expect(screen.getByText(/Lucky/)).toBeDefined()
  })

  it('renders the daily message', () => {
    render(<AstroWidget />)
    expect(screen.getByText(/Saturday is ruled by Saturn/)).toBeDefined()
  })
})
