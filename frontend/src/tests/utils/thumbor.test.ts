import { describe, it, expect } from 'vitest'
import { buildThumborUrl } from '../../utils/thumbor.js'

describe('buildThumborUrl', () => {
  it('builds a smart-crop cover URL with the requested dimensions', () => {
    const url = buildThumborUrl('photo.jpg', 800, 600, 'cover')
    expect(url).toBe('/thumbor/unsafe/800x600/smart/filters:sharpen(0.6,0.5,true)/photo.jpg')
  })

  it('defaults to cover fit when fit not specified', () => {
    const url = buildThumborUrl('photo.jpg', 800, 600)
    expect(url).toContain('/smart/')
    expect(url).not.toContain('/fit-in/')
  })

  it('builds a fit-in URL for contain fit', () => {
    const url = buildThumborUrl('photo.jpg', 800, 600, 'contain')
    expect(url).toBe('/thumbor/unsafe/fit-in/800x600/filters:sharpen(0.6,0.5,true)/photo.jpg')
  })

  it('rounds fractional dimensions', () => {
    const url = buildThumborUrl('photo.jpg', 800.4, 599.6, 'cover')
    expect(url).toContain('/800x600/')
  })

  it('clamps zero or negative dimensions to 1', () => {
    const url = buildThumborUrl('photo.jpg', 0, -50, 'cover')
    expect(url).toContain('/1x1/')
  })

  it('always includes the sharpen filter', () => {
    expect(buildThumborUrl('a.jpg', 100, 100, 'cover')).toContain('filters:sharpen(0.6,0.5,true)')
    expect(buildThumborUrl('a.jpg', 100, 100, 'contain')).toContain(
      'filters:sharpen(0.6,0.5,true)'
    )
  })

  it('produces relative URLs starting with /thumbor/unsafe/', () => {
    const url = buildThumborUrl('photo.jpg', 800, 600)
    expect(url.startsWith('/thumbor/unsafe/')).toBe(true)
  })

  it('preserves the filename verbatim', () => {
    const url = buildThumborUrl('abc123def456.heic', 100, 100)
    expect(url.endsWith('/abc123def456.heic')).toBe(true)
  })
})
