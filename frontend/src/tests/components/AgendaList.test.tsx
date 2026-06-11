import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { AgendaList } from '../../components/AgendaList.js'
import { CalendarEvent } from '../../types/index.js'

function makeEvent(id: string, title: string, hoursFromNow: number): CalendarEvent {
  const start = new Date(Date.now() + hoursFromNow * 3600_000)
  const end = new Date(start.getTime() + 3600_000)
  return { id, title, start: start.toISOString(), end: end.toISOString(), allDay: false }
}

describe('AgendaList', () => {
  it('renders upcoming events sorted by start time', () => {
    const events = [makeEvent('2', 'Dentist', 30), makeEvent('1', 'Coffee', 2)]
    const { container } = render(<AgendaList events={events} loading={false} />)
    const text = container.textContent ?? ''
    expect(text.indexOf('Coffee')).toBeLessThan(text.indexOf('Dentist'))
  })

  it('filters out past events', () => {
    const events = [makeEvent('1', 'Old meeting', -5), makeEvent('2', 'Coffee', 2)]
    const { queryByText, getByText } = render(<AgendaList events={events} loading={false} />)
    expect(queryByText('Old meeting')).toBeNull()
    expect(getByText('Coffee')).toBeTruthy()
  })

  it('labels same-day events as Today', () => {
    // An event one minute out is always "today"
    const events = [makeEvent('1', 'Soon', 1 / 60)]
    const { getByText } = render(<AgendaList events={events} loading={false} />)
    expect(getByText(/Today/)).toBeTruthy()
  })

  it('respects maxItems', () => {
    const events = Array.from({ length: 8 }, (_, i) => makeEvent(`${i}`, `Event ${i}`, i + 1))
    const { container } = render(<AgendaList events={events} loading={false} maxItems={3} />)
    expect((container.textContent?.match(/Event \d/g) ?? []).length).toBe(3)
  })

  it('shows empty state', () => {
    const { getByText } = render(<AgendaList events={[]} loading={false} />)
    expect(getByText(/Nothing scheduled/)).toBeTruthy()
  })

  it('shows loading state', () => {
    const { getByText } = render(<AgendaList events={[]} loading={true} />)
    expect(getByText(/Loading/)).toBeTruthy()
  })

  it('renders sticky notes with backgrounds when noteColors is given', () => {
    const events = [makeEvent('1', 'Coffee', 2), makeEvent('2', 'Dentist', 4)]
    const { getByText } = render(
      <AgendaList events={events} loading={false} noteColors={['#fff6a8', '#ffd1dc']} />
    )
    const note = getByText('Coffee').parentElement as HTMLElement
    expect(note.style.background).toBeTruthy()
    expect(note.style.transform).toContain('rotate')
  })

  it('marks all-day events', () => {
    const event = makeEvent('1', 'Holiday', 2)
    event.allDay = true
    const { getByText } = render(<AgendaList events={[event]} loading={false} />)
    expect(getByText('All day')).toBeTruthy()
  })
})
