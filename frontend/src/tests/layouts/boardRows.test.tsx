import { describe, it, expect } from 'vitest'
import { collapseMedia } from '../../layouts/departures/boardRows.js'
import { UpcomingItem } from '../../types/index.js'

function ep(title: string, date: string, code: string): UpcomingItem {
  return { title, type: 'episode', date, subtitle: code }
}

describe('collapseMedia', () => {
  it('collapses a sequential run of episodes into a range', () => {
    const items: UpcomingItem[] = Array.from({ length: 8 }, (_, i) =>
      ep('The Bear', '2026-06-14', `S05E0${i + 1}`)
    )
    const rows = collapseMedia(items)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ title: 'The Bear', date: '2026-06-14', detail: 'S05E01-08' })
  })

  it('leaves a single episode untouched', () => {
    const rows = collapseMedia([ep('The Daily Show', '2026-06-14', 'S31E81')])
    expect(rows).toHaveLength(1)
    expect(rows[0].detail).toBe('S31E81')
  })

  it('groups by series, season, and day separately', () => {
    const rows = collapseMedia([
      ep('The Bear', '2026-06-14', 'S05E01'),
      ep('The Bear', '2026-06-14', 'S05E02'),
      ep('The Bear', '2026-06-15', 'S05E03'), // different day
      ep('The Bear', '2026-06-14', 'S04E10'), // different season
    ])
    const bear614s5 = rows.find((r) => r.date === '2026-06-14' && r.detail.startsWith('S05'))
    const bear615 = rows.find((r) => r.date === '2026-06-15')
    const bear614s4 = rows.find((r) => r.detail.startsWith('S04'))
    expect(bear614s5?.detail).toBe('S05E01-02')
    expect(bear615?.detail).toBe('S05E03')
    expect(bear614s4?.detail).toBe('S04E10')
    expect(rows).toHaveLength(3)
  })

  it('passes movies through unchanged', () => {
    const rows = collapseMedia([
      { title: 'The Invite', type: 'movie', date: '2026-06-14', subtitle: '2026' },
    ])
    expect(rows[0]).toMatchObject({ title: 'The Invite', detail: '2026' })
  })

  it('preserves first-seen order', () => {
    const rows = collapseMedia([
      ep('Show A', '2026-06-14', 'S01E01'),
      ep('Show B', '2026-06-14', 'S01E01'),
      ep('Show A', '2026-06-14', 'S01E02'),
    ])
    expect(rows.map((r) => r.title)).toEqual(['Show A', 'Show B'])
    expect(rows[0].detail).toBe('S01E01-02')
  })
})
