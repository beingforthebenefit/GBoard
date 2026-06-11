import { describe, it, expect, vi } from 'vitest'
import { act, render } from '@testing-library/react'
import { SplitFlapBoard, BoardRow } from '../../components/SplitFlapBoard.js'

const rows: BoardRow[] = [
  { time: '10:00A', title: 'Dentist', status: 'ON TIME', statusKind: 'ok' },
  {
    time: 'NOW',
    title: 'Breaking Bad',
    detail: 'S01E01 · gerald · 42%',
    status: 'IN FLIGHT',
    statusKind: 'active',
  },
]

describe('SplitFlapBoard', () => {
  it('renders row titles as uppercase flap tiles', () => {
    const { container } = render(<SplitFlapBoard rows={rows} />)
    expect(container.textContent).toContain('DENTIST')
    expect(container.textContent).toContain('BREAKING BAD')
  })

  it('renders one tile per character', () => {
    const { container } = render(<SplitFlapBoard rows={[rows[0]]} titleWidth={10} />)
    // 7 time tiles + 10 title tiles
    expect(container.querySelectorAll('.flap-tile').length).toBe(17)
  })

  it('truncates titles longer than titleWidth', () => {
    const { container } = render(
      <SplitFlapBoard rows={[{ ...rows[0], title: 'A very long event title' }]} titleWidth={6} />
    )
    expect(container.textContent).toContain('A VERY')
    expect(container.textContent).not.toContain('A VERY LONG')
  })

  it('shows statuses and column headers', () => {
    const { getByText } = render(<SplitFlapBoard rows={rows} />)
    expect(getByText('ON TIME')).toBeTruthy()
    expect(getByText('IN FLIGHT')).toBeTruthy()
    expect(getByText('Destination')).toBeTruthy()
  })

  it('renders detail text', () => {
    const { getByText } = render(<SplitFlapBoard rows={rows} />)
    expect(getByText(/S01E01 · gerald · 42%/)).toBeTruthy()
  })

  it('shows an empty-board message', () => {
    const { getByText } = render(<SplitFlapBoard rows={[]} />)
    expect(getByText(/NO SCHEDULED DEPARTURES/)).toBeTruthy()
  })

  it('folds accents and keeps emoji as single printed flaps', () => {
    const { container } = render(
      <SplitFlapBoard rows={[{ time: 'NOW', title: 'Haüm 👤 party', status: 'ON TIME' }]} />
    )
    expect(container.textContent).toContain('HAUM 👤 PARTY')
  })

  it('keeps multi-codepoint emoji in one flap cell', () => {
    const { container } = render(
      <SplitFlapBoard rows={[{ time: 'NOW', title: '👨‍👩‍👧', status: 'ON TIME' }]} titleWidth={5} />
    )
    const filledTiles = Array.from(container.querySelectorAll('[data-flap-char]')).filter((el) =>
      el.textContent?.trim()
    )
    // NOW (3 tiles) + the family emoji in a single tile
    expect(filledTiles.length).toBe(4)
    expect(container.textContent).toContain('👨‍👩‍👧')
  })

  it('pads the board with blank flap rows up to minRows', () => {
    const { container } = render(<SplitFlapBoard rows={[rows[0]]} titleWidth={10} minRows={4} />)
    // 4 rows × (7 time tiles + 10 title tiles)
    expect(container.querySelectorAll('.flap-tile').length).toBe(68)
  })

  it('settles every tile back on its target character after a spin sweep', () => {
    vi.useFakeTimers()
    try {
      const { container } = render(<SplitFlapBoard rows={rows} sweepSeed={3} />)
      act(() => {
        vi.advanceTimersByTime(10_000)
      })
      expect(container.textContent).toContain('DENTIST')
      expect(container.textContent).toContain('BREAKING BAD')
    } finally {
      vi.useRealTimers()
    }
  })
})
