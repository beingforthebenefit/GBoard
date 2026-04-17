import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, fireEvent, act } from '@testing-library/react'

vi.mock('../../hooks/useElementSize.js', () => ({
  useElementSize: () => ({ width: 1920, height: 1080 }),
}))

import { PhotoBackground } from '../../components/PhotoBackground.js'
import { PhotoInfo } from '../../types/index.js'

function p(filename: string): PhotoInfo {
  return { filename }
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
    const { container } = render(<PhotoBackground photos={[p('photo1.jpg')]} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
    for (const img of imgs) {
      expect(img.src).toContain('/thumbor/unsafe/')
      expect(img.src).toContain('photo1.jpg')
    }
  })

  it('renders two photo images for crossfade when given multiple photos', () => {
    const photos = [p('photo1.jpg'), p('photo2.jpg'), p('photo3.jpg')]
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
  })

  it('uses all provided photos (shuffle does not lose any)', () => {
    const filenames = Array.from({ length: 10 }, (_, i) => `p${i}.jpg`)
    const photos = filenames.map(p)
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    for (const img of imgs) {
      expect(filenames.some((f) => img.src.includes(f))).toBe(true)
    }
  })

  it('retries failed image loads every 5 seconds', () => {
    const { container } = render(<PhotoBackground photos={[p('photo1.jpg')]} />)
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
    const photos = [p('photo1.jpg'), p('photo2.jpg'), p('photo3.jpg')]
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
    const photos = [p('photo1.jpg'), p('photo2.jpg'), p('photo3.jpg')]
    const { container } = render(
      <PhotoBackground photos={photos} intervalMs={intervalMs} transitionMs={transitionMs} />
    )

    const getImgs = () => Array.from(container.querySelectorAll<HTMLImageElement>('img'))
    const imgs = getImgs()
    expect(imgs.length).toBe(2)
    expect(imgs[0].style.opacity).toBe('1')
    expect(imgs[1].style.opacity).toBe('0')

    act(() => {
      vi.advanceTimersByTime(intervalMs)
    })

    const imgsAfter = getImgs()
    expect(imgsAfter[0].style.opacity).toBe('1')
    expect(imgsAfter[1].style.opacity).toBe('1')

    act(() => {
      vi.advanceTimersByTime(transitionMs)
    })

    act(() => {
      vi.advanceTimersByTime(intervalMs - transitionMs)
    })

    const imgsNext = getImgs()
    expect(imgsNext[0].style.opacity).toBe('1')
    expect(imgsNext[1].style.opacity).toBe('0')
  })
})
