import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MosaicField, timeHue, mosaicPalette } from '../../components/MosaicField.js'

describe('timeHue', () => {
  const at = (h: number, m = 0) => new Date(2025, 0, 1, h, m, 0)

  it('is 0 at midnight', () => {
    expect(timeHue(at(0))).toBe(0)
  })

  it('completes a full rotation over the cycle (default 12h)', () => {
    expect(timeHue(at(6))).toBeCloseTo(180, 5)
    expect(timeHue(at(12))).toBeCloseTo(0, 5) // 360 wraps to 0
    expect(timeHue(at(3))).toBeCloseTo(90, 5)
  })

  it('advances ~30° per hour by default', () => {
    expect(timeHue(at(2)) - timeHue(at(1))).toBeCloseTo(30, 5)
  })

  it('honors a custom cycle length', () => {
    expect(timeHue(at(6), 24)).toBeCloseTo(90, 5)
  })

  it('stays within 0..360', () => {
    const h = timeHue(at(23, 59))
    expect(h).toBeGreaterThanOrEqual(0)
    expect(h).toBeLessThan(360)
  })
})

describe('mosaicPalette', () => {
  it('uses a near-black substrate and darker tiles at night', () => {
    const dark = mosaicPalette(true)
    const light = mosaicPalette(false)
    expect(dark.bg).toBe('#06060b')
    expect(light.bg).toBe('#e9e3d6')
    expect(dark.light).toBeLessThan(light.light)
  })
})

describe('MosaicField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(
      <MosaicField weather={null} piholeData={null} sessions={[]} dark={true} shimmer={1} />
    )
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
