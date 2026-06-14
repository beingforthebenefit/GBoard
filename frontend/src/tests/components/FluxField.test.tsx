import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { FluxField, tempToHue, fluxPalette } from '../../components/FluxField.js'

describe('tempToHue', () => {
  it('returns cold indigo hues at the bottom of the range', () => {
    expect(tempToHue(10)).toBe(250)
    expect(tempToHue(25)).toBe(250)
  })

  it('returns hot red hues at the top of the range', () => {
    expect(tempToHue(95)).toBe(-20)
    expect(tempToHue(110)).toBe(-20)
  })

  it('moves monotonically warmer (lower hue) as temperature rises', () => {
    expect(tempToHue(40)).toBeGreaterThan(tempToHue(55))
    expect(tempToHue(55)).toBeGreaterThan(tempToHue(68))
    expect(tempToHue(68)).toBeGreaterThan(tempToHue(82))
  })

  it('interpolates between stops', () => {
    // Halfway between 40°(210) and 55°(180)
    expect(tempToHue(47.5)).toBeCloseTo(195, 5)
  })
})

describe('fluxPalette', () => {
  it('wraps negative hot hues into 0..360', () => {
    const pal = fluxPalette(100, true)
    expect(pal.hue).toBeGreaterThanOrEqual(0)
    expect(pal.hue).toBeLessThan(360)
    expect(pal.hue).toBeCloseTo(340, 5)
  })

  it('uses a dark fade and brighter particles in dark mode', () => {
    const dark = fluxPalette(60, true)
    const light = fluxPalette(60, false)
    expect(dark.bgFade).toContain('6, 8, 16')
    expect(light.bgFade).toContain('244, 241, 234')
    expect(dark.light).toBeGreaterThan(light.light)
  })

  it('defaults to a mild hue when temperature is null', () => {
    expect(fluxPalette(null, true).hue).toBeCloseTo(tempToHue(60), 5)
  })
})

describe('FluxField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(<FluxField weather={null} dark={true} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
