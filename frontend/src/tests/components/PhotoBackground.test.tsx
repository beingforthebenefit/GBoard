import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'
import { PhotoBackground } from '../../components/PhotoBackground.js'
import { PhotoInfo } from '../../types/index.js'

function p(url: string): PhotoInfo {
  return { url }
}

describe('PhotoBackground', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders empty placeholder when no photos', () => {
    const { container } = render(<PhotoBackground photos={[]} />)
    const el = container.querySelector('.rounded-2xl')
    expect(el).toBeTruthy()
  })

  it('renders images when photos provided', () => {
    const { container } = render(<PhotoBackground photos={[p('https://example.com/photo1.jpg')]} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
    for (const img of imgs) {
      expect(img.src.startsWith('https://example.com/photo1.jpg')).toBe(true)
    }
  })

  it('renders two photo images for crossfade when given multiple photos', () => {
    const photos = [
      p('https://example.com/photo1.jpg'),
      p('https://example.com/photo2.jpg'),
      p('https://example.com/photo3.jpg'),
    ]
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
  })

  it('uses all provided photos (shuffle does not lose any)', () => {
    const urls = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}.jpg`)
    const photos = urls.map(p)
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    for (const img of imgs) {
      expect(urls.some((url) => img.src.startsWith(url))).toBe(true)
    }
  })

  it('retries failed image loads every 5 seconds', () => {
    const { container } = render(<PhotoBackground photos={[p('https://example.com/photo1.jpg')]} />)
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
      p('https://example.com/photo1.jpg'),
      p('https://example.com/photo2.jpg'),
      p('https://example.com/photo3.jpg'),
    ]
    const { container } = render(<PhotoBackground photos={photos} />)
    const getImgSrcs = () =>
      Array.from(container.querySelectorAll('img')).map((img) => img.getAttribute('src') ?? '')

    const initialSrcs = getImgSrcs()

    const img = container.querySelector('img') as HTMLImageElement
    fireEvent.error(img)
    act(() => {
      vi.advanceTimersByTime(5000)
    })
    fireEvent.error(img)
    act(() => {
      vi.advanceTimersByTime(5000)
    })

    const newSrcs = getImgSrcs()
    expect(newSrcs).not.toEqual(initialSrcs)
  })

  it('triggers crossfade transition after intervalMs elapses', () => {
    const intervalMs = 10_000
    const transitionMs = 2000
    const photos = [
      p('https://example.com/photo1.jpg'),
      p('https://example.com/photo2.jpg'),
      p('https://example.com/photo3.jpg'),
    ]
    const { container } = render(
      <PhotoBackground photos={photos} intervalMs={intervalMs} transitionMs={transitionMs} />
    )

    const getImgs = () => Array.from(container.querySelectorAll<HTMLImageElement>('img'))
    const imgs = getImgs()
    expect(imgs.length).toBe(2)
    // Slot A always opacity 1, slot B starts hidden
    expect(imgs[0].style.opacity).toBe('1')
    expect(imgs[1].style.opacity).toBe('0')

    act(() => {
      vi.advanceTimersByTime(intervalMs)
    })

    // B fades in on top of A (A stays at 1, no background bleedthrough)
    const imgsAfter = getImgs()
    expect(imgsAfter[0].style.opacity).toBe('1')
    expect(imgsAfter[1].style.opacity).toBe('1')

    // After transition completes, hidden slot (A) loads next photo
    act(() => {
      vi.advanceTimersByTime(transitionMs)
    })

    // Next interval: B fades back out, revealing A with new photo
    act(() => {
      vi.advanceTimersByTime(intervalMs - transitionMs)
    })

    const imgsNext = getImgs()
    expect(imgsNext[0].style.opacity).toBe('1')
    expect(imgsNext[1].style.opacity).toBe('0')
  })
})
