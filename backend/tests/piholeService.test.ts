import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchPiholeStats,
  deletePiholeSession,
  loadSession,
  _resetSession,
} from '../src/services/piholeService.js'

const mockFetch = vi.fn()
vi.stubGlobal('fetch', mockFetch)

beforeEach(() => {
  mockFetch.mockReset()
  _resetSession()
  vi.stubEnv('PIHOLE_URL', 'http://pihole.test')
  vi.stubEnv('PIHOLE_PASSWORD', 'testpass')
  vi.stubEnv('PIHOLE_CLIENT_ALIASES', '')
})

const authResponse = {
  session: { sid: 'test-sid-123' },
}

const statsResponse = {
  queries: { total: 150000, blocked: 45000, percent_blocked: 30.0 },
  gravity: { domains_being_blocked: 120000 },
}

const blockingResponse = {
  blocking: 'enabled',
}

const clientsResponse = {
  clients: [
    { name: 'pi.hole', ip: '192.168.1.2', count: 4000 },
    { name: 'resolver-v6', ip: '::', count: 3100 },
    { name: 'localhost.lan', ip: '127.0.0.1', count: 2500 },
    { name: 'LivingRoomTV', ip: '192.168.1.40', count: 1300 },
    { name: 'iPhone', ip: '192.168.1.22', count: 980 },
    { name: '192.168.1.18', ip: '192.168.1.18', count: 410 },
    { name: 'Laptop', ip: '192.168.1.12', count: 600 },
    { name: 'Tablet', ip: '192.168.1.30', count: 550 },
    { name: 'Guest', ip: '192.168.1.50', count: 120 },
  ],
}

const blockedClientsResponse = {
  clients: [
    { name: 'LivingRoomTV', ip: '192.168.1.40', count: 390 },
    { name: 'iPhone', ip: '192.168.1.22', count: 274 },
    { name: 'Laptop', ip: '192.168.1.12', count: 120 },
    { name: 'Tablet', ip: '192.168.1.30', count: 90 },
  ],
}

// Use recent timestamps so they pass the "last hour" filter
const now = Math.floor(Date.now() / 1000)
const historyResponse = {
  history: [
    { timestamp: now - 600, total: 100, blocked: 30 },
    { timestamp: now - 300, total: 80, blocked: 25 },
    { timestamp: now - 60, total: 120, blocked: 40 },
  ],
}

function mockSuccessfulFlow() {
  mockFetch.mockImplementation((url: string) => {
    if (url.includes('/api/auth')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(authResponse),
      })
    }
    if (url.includes('/api/stats/top_clients?count=8&blocked=true')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(blockedClientsResponse),
      })
    }
    if (url.includes('/api/stats/summary')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(statsResponse),
      })
    }
    if (url.includes('/api/dns/blocking')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(blockingResponse),
      })
    }
    if (url.endsWith('/api/history') || url.includes('/api/history')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(historyResponse),
      })
    }
    if (url.includes('/api/stats/top_clients')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(clientsResponse),
      })
    }
    return Promise.resolve({ ok: false, status: 404 })
  })
}

describe('fetchPiholeStats', () => {
  it('authenticates and fetches stats', async () => {
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    expect(stats.totalQueries).toBe(150000)
    expect(stats.blockedQueries).toBe(45000)
    expect(stats.blockedPercentage).toBe(30.0)
    expect(stats.domainsOnBlocklist).toBe(120000)
    expect(stats.status).toBe('enabled')
  })

  it('sums history entries for last hour stats', async () => {
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    expect(stats.queriesLastHour).toBe(300) // 100 + 80 + 120
    expect(stats.blockedLastHour).toBe(95) // 30 + 25 + 40
  })

  it('returns a compact top-clients list sorted by query count', async () => {
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    expect(stats.clients.length).toBe(5)
    expect(stats.clients[0].name).toBe('LivingRoomTV')
    expect(stats.clients[1].name).toBe('iPhone')
    expect(stats.clients[2].name).toBe('Laptop')
    expect(stats.clients[0].blockedQueries).toBe(390)
    expect(stats.clients[0].blockedPercentage).toBe(30)
  })

  it('filters out local Pi-hole and localhost entries from client list', async () => {
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    expect(stats.clients.some((c) => c.name.toLowerCase() === 'pi.hole')).toBe(false)
    expect(stats.clients.some((c) => c.name.toLowerCase().startsWith('localhost'))).toBe(false)
    expect(stats.clients.some((c) => c.ip.startsWith('127.'))).toBe(false)
    expect(stats.clients.some((c) => c.ip === '::')).toBe(false)
  })

  it('applies alias mapping from PIHOLE_CLIENT_ALIASES', async () => {
    vi.stubEnv('PIHOLE_CLIENT_ALIASES', "192.168.1.22=Gerald's iPhone,192.168.1.18=Gerald's iPad")
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    expect(stats.clients.find((c) => c.ip === '192.168.1.22')?.name).toBe("Gerald's iPhone")
    expect(stats.clients.find((c) => c.ip === '192.168.1.18')?.name).toBe("Gerald's iPad")
  })

  it('merges clients that share the same alias name', async () => {
    vi.stubEnv('PIHOLE_CLIENT_ALIASES', '192.168.1.22=Gerald iPhone,192.168.1.50=Gerald iPhone')
    mockSuccessfulFlow()

    const stats = await fetchPiholeStats()
    const merged = stats.clients.filter((c) => c.name === 'Gerald iPhone')
    expect(merged).toHaveLength(1)
    // 980 (iPhone) + 120 (Guest) = 1100
    expect(merged[0].queries).toBe(1100)
  })

  it('sends X-FTL-SID header on API requests', async () => {
    mockSuccessfulFlow()

    await fetchPiholeStats()

    const apiCalls = mockFetch.mock.calls.filter(([url]: [string]) => !url.includes('/api/auth'))
    for (const [, opts] of apiCalls) {
      expect(opts.headers['X-FTL-SID']).toBe('test-sid-123')
    }
  })

  it('re-authenticates on 401 and recovers', async () => {
    let attempt = 0

    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(authResponse),
        })
      }
      // First 3 attempts return 401 (one per parallel request)
      if (!url.includes('/api/auth')) {
        attempt++
        if (attempt <= 3) {
          return Promise.resolve({ ok: false, status: 401 })
        }
        if (url.includes('/api/stats/summary')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(statsResponse),
          })
        }
        if (url.includes('/api/dns/blocking')) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve(blockingResponse),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(historyResponse),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    const stats = await fetchPiholeStats()
    expect(stats.totalQueries).toBe(150000)
  })

  it('throws on auth failure', async () => {
    mockFetch.mockResolvedValue({ ok: false, status: 401 })
    await expect(fetchPiholeStats()).rejects.toThrow('Pi-hole auth failed')
  })

  it('handles empty history gracefully', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(authResponse),
        })
      }
      if (url.includes('/api/stats/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(statsResponse),
        })
      }
      if (url.includes('/api/dns/blocking')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(blockingResponse),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ history: [] }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    const stats = await fetchPiholeStats()
    expect(stats.blockedLastHour).toBe(0)
    expect(stats.queriesLastHour).toBe(0)
    expect(stats.clients).toEqual([])
  })

  it('handles legacy top_sources format in client response', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(authResponse),
        })
      }
      if (url.includes('/api/stats/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(statsResponse),
        })
      }
      if (url.includes('/api/dns/blocking')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(blockingResponse),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(historyResponse),
        })
      }
      if (url.includes('/api/stats/top_clients?count=8&blocked=true')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              top_sources: { '192.168.1.40': 200, '192.168.1.22': 150 },
            }),
        })
      }
      if (url.includes('/api/stats/top_clients')) {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              top_sources: {
                '192.168.1.40': 1300,
                '192.168.1.22': 980,
                '192.168.1.12': 600,
              },
            }),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    const stats = await fetchPiholeStats()
    expect(stats.clients.length).toBeGreaterThan(0)
    // Verify clients were parsed from legacy top_sources format
    expect(stats.clients[0].queries).toBeGreaterThan(0)
  })

  it('rate limits after 429 response and fails fast on subsequent calls', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/api/auth')) {
        return Promise.resolve({
          ok: false,
          status: 429,
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    // First call triggers the 429
    await expect(fetchPiholeStats()).rejects.toThrow()

    // Reset mock to prove it won't be called again
    mockFetch.mockClear()

    // Subsequent call should fail fast without calling fetch
    await expect(fetchPiholeStats()).rejects.toThrow('rate limited')
    expect(mockFetch.mock.calls.filter(([url]: [string]) => url.includes('/api/auth')).length).toBe(
      0
    )
  })
})

describe('deletePiholeSession', () => {
  it('sends DELETE to /api/auth when session exists', async () => {
    // First authenticate to get a session
    mockFetch.mockImplementation((url: string, opts?: { method?: string }) => {
      if (url.includes('/api/auth') && opts?.method === 'POST') {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(authResponse),
        })
      }
      if (url.includes('/api/auth') && opts?.method === 'DELETE') {
        return Promise.resolve({ ok: true })
      }
      if (url.includes('/api/stats/summary')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(statsResponse),
        })
      }
      if (url.includes('/api/dns/blocking')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(blockingResponse),
        })
      }
      if (url.includes('/api/history')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(historyResponse),
        })
      }
      if (url.includes('/api/stats/top_clients')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(clientsResponse),
        })
      }
      return Promise.resolve({ ok: false, status: 404 })
    })

    await fetchPiholeStats()
    await deletePiholeSession()

    const deleteCalls = mockFetch.mock.calls.filter(
      ([url, opts]: [string, { method?: string }]) =>
        url.includes('/api/auth') && opts?.method === 'DELETE'
    )
    expect(deleteCalls).toHaveLength(1)
  })

  it('does nothing when no session exists', async () => {
    await deletePiholeSession()
    expect(mockFetch).not.toHaveBeenCalled()
  })
})

describe('loadSession', () => {
  it('can be called without error when no session file exists', () => {
    vi.stubEnv('PIHOLE_SESSION_DIR', '/tmp/nonexistent-pihole-test')
    expect(() => loadSession()).not.toThrow()
  })
})
