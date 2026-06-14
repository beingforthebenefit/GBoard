import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import {
  FractalField,
  fractalPalette,
  makeMotif,
  octaveSeed,
  mulberry32,
} from '../../components/FractalField.js'

describe('mulberry32', () => {
  it('is deterministic for a given seed', () => {
    const a = mulberry32(42)
    const b = mulberry32(42)
    expect(a()).toBe(b())
    expect(a()).toBe(b())
  })

  it('produces values in [0, 1)', () => {
    const rng = mulberry32(7)
    for (let i = 0; i < 50; i++) {
      const v = rng()
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThan(1)
    }
  })
})

describe('octaveSeed', () => {
  it('is stable per (octave, salt) and varies by octave', () => {
    expect(octaveSeed(5, 123)).toBe(octaveSeed(5, 123))
    expect(octaveSeed(5, 123)).not.toBe(octaveSeed(6, 123))
  })

  it('varies by salt so each page load differs', () => {
    expect(octaveSeed(5, 123)).not.toBe(octaveSeed(5, 124))
  })
})

describe('makeMotif', () => {
  it('is deterministic for a given seed', () => {
    expect(makeMotif(999)).toEqual(makeMotif(999))
  })

  it('keeps generated parameters within expected ranges', () => {
    for (let s = 0; s < 40; s++) {
      const m = makeMotif(s * 7919 + 1)
      expect(m.sides).toBeGreaterThanOrEqual(3)
      expect(m.sides).toBeLessThanOrEqual(7)
      expect(m.arms === 0 || (m.arms >= 5 && m.arms <= 10)).toBe(true)
      expect(m.satSides === 0 || (m.satSides >= 3 && m.satSides <= 6)).toBe(true)
      expect(m.shells.length).toBeGreaterThanOrEqual(2)
      m.shells.forEach((r) => {
        expect(r).toBeGreaterThan(0.9)
        expect(r).toBeLessThan(2.1)
      })
    }
  })
})

describe('fractalPalette', () => {
  it('uses a dark substrate at night and a light one by day', () => {
    expect(fractalPalette(true).bg).toBe('#05060a')
    expect(fractalPalette(false).bg).toBe('#efeae0')
  })
})

describe('FractalField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(<FractalField weather={null} dark={true} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
