import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { MosaicField, soberAccentHue, mosaicPalette } from '../../components/MosaicField.js'

describe('soberAccentHue', () => {
  it('starts at 0 for a fresh streak', () => {
    expect(soberAccentHue(0)).toBe(0)
  })

  it('advances slowly with the streak', () => {
    expect(soberAccentHue(100)).toBeCloseTo(90, 5)
  })

  it('wraps within 0..360', () => {
    const h = soberAccentHue(1000)
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
      <MosaicField
        weather={null}
        piholeData={null}
        sessions={[]}
        dark={true}
        accentHue={200}
        shimmer={1}
      />
    )
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
