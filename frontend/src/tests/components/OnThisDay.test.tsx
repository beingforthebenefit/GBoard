import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { OnThisDay } from '../../components/OnThisDay.js'
import { findMemories } from '../../utils/photoMemories.js'
import { PhotoInfo } from '../../types/index.js'

function photoFromYearsAgo(years: number, dayOffset = 0): PhotoInfo {
  const d = new Date()
  d.setFullYear(d.getFullYear() - years)
  d.setDate(d.getDate() + dayOffset)
  return { filename: `photo-${years}-${dayOffset}.jpg`, dateTaken: d.toISOString() }
}

describe('findMemories', () => {
  it('finds photos taken near this date in past years', () => {
    const photos = [photoFromYearsAgo(3), photoFromYearsAgo(1, 2)]
    expect(findMemories(photos, new Date(), 3).length).toBe(2)
  })

  it('excludes photos outside the window', () => {
    const photos = [photoFromYearsAgo(2, 40)]
    expect(findMemories(photos, new Date(), 3).length).toBe(0)
  })

  it('excludes photos from the current year and without dates', () => {
    const photos: PhotoInfo[] = [photoFromYearsAgo(0), { filename: 'undated.jpg' }]
    expect(findMemories(photos, new Date(), 3).length).toBe(0)
  })

  it('computes years ago', () => {
    const memories = findMemories([photoFromYearsAgo(4)], new Date(), 3)
    expect(memories[0].yearsAgo).toBe(4)
  })
})

describe('OnThisDay', () => {
  it('renders a caption for a memory photo', () => {
    const { getByText } = render(<OnThisDay photos={[photoFromYearsAgo(2)]} />)
    expect(getByText(/On this day/)).toBeTruthy()
    expect(getByText(/2 years ago/)).toBeTruthy()
  })

  it('includes the location when available', () => {
    const photo = photoFromYearsAgo(2)
    photo.location = { lat: 0, lon: 0, city: 'Asheville', state: 'NC' }
    const { getByText } = render(<OnThisDay photos={[photo]} />)
    expect(getByText(/Asheville, NC/)).toBeTruthy()
  })

  it('renders nothing when there are no memories', () => {
    const { container } = render(<OnThisDay photos={[photoFromYearsAgo(2, 30)]} />)
    expect(container.firstChild).toBeNull()
  })
})
