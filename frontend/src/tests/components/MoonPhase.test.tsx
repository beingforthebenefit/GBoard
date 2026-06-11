import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MoonPhase } from '../../components/MoonPhase.js'
import { litPath } from '../../utils/moonPhase.js'

// 2000-01-21 was a full moon
const FULL_MOON = new Date(Date.UTC(2000, 0, 21, 4, 40))

describe('MoonPhase', () => {
  it('renders the phase name and illumination', () => {
    const { getByText } = render(<MoonPhase date={FULL_MOON} />)
    expect(getByText('Full Moon')).toBeTruthy()
    expect(getByText(/\d+% lit/)).toBeTruthy()
  })

  it('hides the label when showLabel is false', () => {
    const { queryByText, container } = render(<MoonPhase date={FULL_MOON} showLabel={false} />)
    expect(queryByText('Full Moon')).toBeNull()
    expect(container.querySelector('svg')).toBeTruthy()
  })

  it('sets an aria-label on the svg', () => {
    const { container } = render(<MoonPhase date={FULL_MOON} />)
    expect(container.querySelector('svg')?.getAttribute('aria-label')).toBe('Full Moon')
  })

  it('builds valid lit paths for all phases', () => {
    for (const phase of [0, 0.1, 0.25, 0.4, 0.5, 0.6, 0.75, 0.9]) {
      const d = litPath(phase)
      expect(d).toMatch(/^M /)
      expect(d).not.toContain('NaN')
    }
  })
})
