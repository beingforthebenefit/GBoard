import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { BambooField, tempToBambooHue, bambooPalette } from '../../components/BambooField.js'

describe('tempToBambooHue', () => {
  it('returns cool teal when cold', () => {
    expect(tempToBambooHue(10)).toBe(210)
    expect(tempToBambooHue(30)).toBe(210)
  })

  it('returns warm hues when hot', () => {
    expect(tempToBambooHue(92)).toBe(-10)
    expect(tempToBambooHue(110)).toBe(-10)
  })

  it('interpolates between stops', () => {
    // Halfway between 30°(210) and 55°(160)
    expect(tempToBambooHue(42.5)).toBeCloseTo(185, 5)
  })
})

describe('bambooPalette', () => {
  it('uses darker, more saturated stalks at night', () => {
    const dark = bambooPalette(true)
    const light = bambooPalette(false)
    expect(dark.baseLight).toBeLessThan(light.baseLight)
    expect(dark.sat).toBeGreaterThan(light.sat)
  })
})

describe('BambooField', () => {
  it('renders a canvas without crashing when canvas is unavailable', () => {
    const { container } = render(<BambooField weather={null} dark={true} />)
    expect(container.querySelector('canvas')).toBeTruthy()
  })
})
