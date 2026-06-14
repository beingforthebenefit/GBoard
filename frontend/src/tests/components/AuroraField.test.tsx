import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AuroraField, tempToAnchorHue, auroraPalette } from '../../components/AuroraField.js'

describe('tempToAnchorHue', () => {
  it('returns cold blue hues at the bottom of the range', () => {
    expect(tempToAnchorHue(10)).toBe(210)
    expect(tempToAnchorHue(30)).toBe(210)
  })

  it('returns warm magenta hues at the top of the range', () => {
    expect(tempToAnchorHue(90)).toBe(320)
    expect(tempToAnchorHue(120)).toBe(320)
  })

  it('interpolates between stops', () => {
    // Halfway between 30°(210) and 50°(160)
    expect(tempToAnchorHue(40)).toBeCloseTo(185, 5)
  })

  it('passes through the aurora-green band in the mild range', () => {
    expect(tempToAnchorHue(50)).toBe(160)
  })
})

describe('auroraPalette', () => {
  it('uses additive blending on a dark substrate at night', () => {
    const dark = auroraPalette(true)
    expect(dark.bg).toBe('#04050a')
    expect(dark.composite).toBe('lighter')
  })

  it('uses multiply blending on a light substrate by day', () => {
    const light = auroraPalette(false)
    expect(light.bg).toBe('#f4f1ea')
    expect(light.composite).toBe('multiply')
  })
})

describe('AuroraField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(<AuroraField weather={null} dark={true} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
