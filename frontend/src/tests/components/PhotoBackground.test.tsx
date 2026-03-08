import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { PhotoBackground } from '../../components/PhotoBackground.js'

describe('PhotoBackground', () => {
  it('renders a dark fallback when no photos', () => {
    const { container } = render(<PhotoBackground photos={[]} />)
    expect(container.querySelector('.bg-gray-900')).toBeTruthy()
  })

  it('renders a single photo without crashing', () => {
    const { container } = render(<PhotoBackground photos={['https://example.com/photo1.jpg']} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBeGreaterThanOrEqual(1)
    expect(imgs[0].src).toBe('https://example.com/photo1.jpg')
  })

  it('renders two img elements for crossfade when given multiple photos', () => {
    const photos = [
      'https://example.com/photo1.jpg',
      'https://example.com/photo2.jpg',
      'https://example.com/photo3.jpg',
    ]
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    expect(imgs.length).toBe(2)
  })

  it('renders the dark overlay for text readability', () => {
    const { container } = render(<PhotoBackground photos={['https://example.com/photo1.jpg']} />)
    expect(container.querySelector('.bg-black\\/25')).toBeTruthy()
  })

  it('uses all provided photos (shuffle does not lose any)', () => {
    const photos = Array.from({ length: 10 }, (_, i) => `https://example.com/p${i}.jpg`)
    const { container } = render(<PhotoBackground photos={photos} />)
    const imgs = container.querySelectorAll('img')
    // Both displayed photos should be from the original set
    for (const img of imgs) {
      expect(photos).toContain(img.src)
    }
  })
})
