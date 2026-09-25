import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MobileApp } from '../../mobile/MobileApp.js'
import { soberLine } from '../../mobile/status.js'
import { fitness, mobileData } from './fixtures.js'

type Responses = Record<string, unknown | Error>

function mockApi(over: Responses = {}) {
  const d = mobileData()
  const base: Responses = {
    '/api/version': { startedAt: 1 },
    '/api/fitness': d.fitness,
    '/api/weather': d.weather,
    '/api/calendar': { events: d.events },
    '/api/media': { items: d.media },
    '/api/word': d.word,
    '/api/homeassistant': d.ha,
    '/api/pihole': d.pihole,
    '/api/plex': { sessions: d.plex },
    ...over,
  }
  const fn = vi.fn(async (url: string) => {
    const body = base[url]
    if (body instanceof Error || body === undefined)
      return { ok: false, status: 500, json: async () => ({}) }
    return { ok: true, status: 200, json: async () => body }
  })
  globalThis.fetch = fn as unknown as typeof fetch
  return fn
}

describe('MobileApp', () => {
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    localStorage.clear()
    vi.useFakeTimers({ shouldAdvanceTime: true })
    vi.setSystemTime(new Date('2026-09-25T15:30:00'))
  })

  afterEach(() => {
    globalThis.fetch = originalFetch
    vi.useRealTimers()
  })

  it('shows what needs attention, then the glance board', async () => {
    mockApi()
    render(<MobileApp />)
    const attn = await screen.findByRole('region', { name: 'Needs attention' })
    expect(within(attn).getByText('Ride 60 minutes today')).toBeInTheDocument()
    const board = screen.getByRole('region', { name: 'Today at a glance' })
    expect(within(board).getByText('116/72')).toBeInTheDocument()
    expect(within(board).getByText('Grocery pickup')).toBeInTheDocument()
  })

  it('fetches every endpoint once on open, and not on a timer before five minutes', async () => {
    const fn = mockApi()
    render(<MobileApp />)
    await screen.findByText('Updated just now')
    const calls = fn.mock.calls.length
    expect(calls).toBe(9) // version + 8 endpoints
    vi.advanceTimersByTime(60_000)
    expect(fn.mock.calls.length).toBe(calls)
  })

  it('refreshes from the header button', async () => {
    const fn = mockApi()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MobileApp />)
    await screen.findByRole('region', { name: 'Needs attention' })
    const before = fn.mock.calls.length
    await user.click(screen.getByRole('button', { name: 'Refresh' }))
    await waitFor(() => expect(fn.mock.calls.length).toBe(before + 9))
  })

  it('tells you Pi-hole is down instead of showing old numbers', async () => {
    mockApi({ '/api/pihole': new Error('down') })
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MobileApp />)
    const attn = await screen.findByRole('region', { name: 'Needs attention' })
    expect(within(attn).getByText("Pi-hole isn't answering")).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: /^Infra/ }))
    expect(screen.queryByText('Blocked today')).not.toBeInTheDocument()
  })

  it('warns when the phone has stopped syncing', async () => {
    mockApi({ '/api/fitness': fitness({ ingestAgeHours: 31 }) })
    render(<MobileApp />)
    expect(await screen.findByText('Phone last synced 31 hours ago')).toBeInTheDocument()
    expect(screen.getByText('Last synced 31 hours ago')).toBeInTheDocument()
  })

  it('opens and closes sections, and remembers the choice', async () => {
    mockApi()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MobileApp />)
    await screen.findByRole('region', { name: 'Needs attention' })
    const today = screen.getByRole('button', { name: /^Today/ })
    expect(today).toHaveAttribute('aria-expanded', 'false')
    await user.click(today)
    expect(today).toHaveAttribute('aria-expanded', 'true')
    expect(localStorage.getItem('gbm-open-today')).toBe('1')
  })

  it('shows conjugations on request', async () => {
    mockApi()
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    render(<MobileApp />)
    await screen.findByRole('region', { name: 'Needs attention' })
    await user.click(screen.getByRole('button', { name: /^Today/ }))
    await user.click(screen.getByRole('button', { name: 'Show conjugations' }))
    expect(screen.getByText('sé')).toBeInTheDocument()
  })

  it('says Apple Health is not connected rather than showing zeros', async () => {
    mockApi({ '/api/fitness': fitness({ configured: false }) })
    render(<MobileApp />)
    expect(await screen.findByText("Apple Health isn't connected")).toBeInTheDocument()
  })
})

describe('soberLine', () => {
  it('reads as a sentence, dropping empty units', () => {
    expect(soberLine('2024-06-14T00:00:00', new Date('2026-09-25T12:00:00'))).toBe(
      'Sober 2 years, 3 months, 11 days'
    )
    expect(soberLine('2026-09-20T00:00:00', new Date('2026-09-25T12:00:00'))).toBe('Sober 5 days')
    expect(soberLine(undefined, new Date())).toBeNull()
    expect(soberLine('nonsense', new Date())).toBeNull()
  })
})
