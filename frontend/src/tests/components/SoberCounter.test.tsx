import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { SoberCounter } from '../../components/SoberCounter.js'

vi.mock('../../hooks/useSoberCounter.js', () => ({
  useSoberCounter: () => ({ years: 1, months: 2, days: 3, hours: 4 }),
}))

describe('SoberCounter', () => {
  it('renders the "Sober Time" heading', () => {
    render(<SoberCounter sobrietyDate="2025-01-09" />)
    expect(screen.getByText('Sober Time')).toBeDefined()
  })

  it('renders all four duration cells with correct values', () => {
    render(<SoberCounter sobrietyDate="2025-01-09" />)
    expect(screen.getByText('1')).toBeDefined()
    expect(screen.getByText('2')).toBeDefined()
    expect(screen.getByText('3')).toBeDefined()
    expect(screen.getByText('4')).toBeDefined()
  })

  it('renders all four labels', () => {
    render(<SoberCounter sobrietyDate="2025-01-09" />)
    expect(screen.getByText('YEARS')).toBeDefined()
    expect(screen.getByText('MONTHS')).toBeDefined()
    expect(screen.getByText('DAYS')).toBeDefined()
    expect(screen.getByText('HOURS')).toBeDefined()
  })
})
