import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { OrigamiField, tempToPaperHue, origamiPalette } from '../../components/OrigamiField.js'

describe('tempToPaperHue', () => {
  it('returns cool blue paper when cold', () => {
    expect(tempToPaperHue(10)).toBe(210)
    expect(tempToPaperHue(30)).toBe(210)
  })

  it('returns warm paper when hot', () => {
    expect(tempToPaperHue(92)).toBe(-10)
    expect(tempToPaperHue(110)).toBe(-10)
  })

  it('interpolates between stops', () => {
    // Halfway between 30°(210) and 55°(160)
    expect(tempToPaperHue(42.5)).toBeCloseTo(185, 5)
  })
})

describe('origamiPalette', () => {
  it('uses darker, more saturated paper at night', () => {
    const dark = origamiPalette(true)
    const light = origamiPalette(false)
    expect(dark.baseLight).toBeLessThan(light.baseLight)
    expect(dark.sat).toBeGreaterThan(light.sat)
  })
})

describe('OrigamiField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(<OrigamiField weather={null} dark={true} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
