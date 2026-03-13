import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { PhotoBackground } from '../../components/PhotoBackground.js'

describe('PhotoBackground', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders a dark fallback when no photos', () => {
    const { container } = render(<PhotoBackground photos={[]} />)
    expect(container.querySelector('.bg-gray-900')).toBeTruthy()
  })

  it('renders a single photo without crashing', () => {
    const { container } = render(<PhotoBackground photos={['https://example.com/photo1.jpg']} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(4)
    for (const img of imgs) {
      expect(img.src.startsWith('https://example.com/photo1.jpg')).toBe(true)
    }
  })

  it('renders two layered photo groups for crossfade when given multiple photos', () => {
    const photos = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
    ]
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(4)
  })

  it('renders the dark overlays for readability and backdrop', () => {
    const { container } = render(<PhotoBackground photos={['https://example.com/photo1.jpg']} />)
    expect(container.querySelector('.bg-black\\/10')).toBeTruthy()
    expect(container.querySelector('.bg-black\\/25')).toBeTruthy()
  })

  it('uses all provided photos (shuffle does not lose any)', () => {
    const photos = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}.jpg`)
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    // Both displayed photos should be from the original set
    for (const img of imgs) {
      expect(photos.some((photo) => img.src.startsWith(photo))).toBe(true)
    }
  })

  it('retries failed image loads every 5 seconds', () => {
    const { container } = render(<PhotoBackground photos={['https://example.com/photo1.jpg']} />)
    const img = container.querySelector('img') as HTMLImageElement

    expect(img.getAttribute('src')).toContain('bgRetry=0')

    fireEvent.error(img)
    act(() => {
      vi.advanceTimersByTime(4999)
    })
    expect(img.getAttribute('src')).toContain('bgRetry=0')

    act(() => {
      vi.advanceTimersByTime(1)
    })
    expect(img.getAttribute('src')).toContain('bgRetry=1')
  })

  it('advances to next photo after max retries exhausted', () => {
    const photos = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
    ]
    const { container } = render(<PhotoBackground photos={photos} />)
    const getImgSrcs = () =>
      Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '')

    const initialSrcs = getImgSrcs()

    // Trigger errors on first image and exhaust retries (MAX_RETRIES = 2)
    const img = container.querySelector('img') as HTMLImageElement
    fireEvent.error(img)
    act(() => {
      vi.advanceTimersByTime(5000)
    }) // retry 1
    fireEvent.error(img)
    act(() => {
      vi.advanceTimersByTime(5000)
    }) // retry 2 — max reached, should advance

    const newSrcs = getImgSrcs()
    // At least one image source should have changed (advanced to next)
    expect(newSrcs).not.toEqual(initialSrcs)
  })

  it('triggers crossfade transition after intervalMs elapses', () => {
    const intervalMs = 10_000
    const transitionMs = 2000
    const photos = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
    ]
    const { container } = render(
      <PhotoBackground photos={photos} intervalMs={intervalMs} transitionMs={transitionMs} />
    )

    // Before interval fires, first layer should be fully opaque (opacity 1)
    const getLayers = () =>
      Array.from(container.querySelectorAll<HTMLDivElement>('.absolute.inset-0.overflow-hidden'))
    const layers = getLayers()
    expect(layers.length).toBe(2)
    expect(layers[0].style.opacity).toBe('1')
    expect(layers[1].style.opacity).toBe('0')

    // Advance past the interval to trigger setIsTransitioning(true)
    act(() => {
      vi.advanceTimersByTime(intervalMs)
    })

    const layersAfter = getLayers()
    // After transition starts, current layer fades out, next fades in
    expect(layersAfter[0].style.opacity).toBe('0')
    expect(layersAfter[1].style.opacity).toBe('1')

    // After transitionMs, advance completes and resets
    act(() => {
      vi.advanceTimersByTime(transitionMs)
    })

    const layersReset = getLayers()
    // After advance, opacity resets (isTransitioning = false again)
    expect(layersReset[0].style.opacity).toBe('1')
    expect(layersReset[1].style.opacity).toBe('0')
  })
})
