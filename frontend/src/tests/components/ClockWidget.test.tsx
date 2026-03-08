import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { ClockWidget } from '../../components/ClockWidget.js'

// Fix time so the test is deterministic
const FIXED_DATE = new Date('2026-03-07T10:18:42.000Z')

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(FIXED_DATE)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('ClockWidget', () => {
  it('renders a 12-hour time string with AM/PM', () => {
    render(<ClockWidget />)
    // The exact value depends on local timezone; verify 12-hour format.
    const timeEl = screen.getByText(/\b\d{1,2}:\d{2}:\d{2}\s?(AM|PM)\b/i)
    expect(timeEl).toBeDefined()
  })

  it('renders a date string', () => {
    render(<ClockWidget />)
    // Should render something like "Saturday, March 7"
    const dateEl = screen.getByText(/\w+, \w+ \d+/)
    expect(dateEl).toBeDefined()
  })
})
