import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WindCompass } from '../../components/WindCompass.js'

describe('WindCompass', () => {
  it('shows speed and direction', () => {
    const { getByText } = render(<WindCompass speed={8} direction="NW" />)
    expect(getByText(/8 mph NW/)).toBeTruthy()
  })

  it('shows gust when provided', () => {
    const { getByText } = render(<WindCompass speed={8} direction="NW" gust={17.6} />)
    expect(getByText(/G 18/)).toBeTruthy()
  })

  it('rotates the needle opposite the reported FROM direction', () => {
    const { container } = render(<WindCompass speed={8} direction="N" />)
    expect(container.querySelector('g')?.getAttribute('transform')).toBe('rotate(180 40 40)')
  })

  it('renders no needle for an unknown direction', () => {
    const { container } = render(<WindCompass speed={8} direction="???" />)
    expect(container.querySelector('polygon')).toBeNull()
  })

  it('renders cardinal labels', () => {
    const { getByText } = render(<WindCompass speed={8} direction="SE" />)
    for (const label of ['N', 'E', 'S', 'W']) {
      expect(getByText(label)).toBeTruthy()
    }
  })
})
