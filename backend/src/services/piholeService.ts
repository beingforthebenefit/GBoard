import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PIHOLE_URL = () => process.env.PIHOLE_URL || 'http://192.168.50.62'
const PIHOLE_PASSWORD = () => process.env.PIHOLE_PASSWORD || ''
const SESSION_DIR = () => process.env.PIHOLE_SESSION_DIR || '/data/photos'
const SESSION_FILE = () => join(SESSION_DIR(), 'pihole-session.json')

let sessionSid: string | null = null
let authInFlight: Promise<string> | null = null
let rateLimitedUntil = 0

function loadSessionFromDisk(): string | null {
  try {
    const data = JSON.parse(readFileSync(SESSION_FILE(), 'utf-8'))
    return data.sid || null
  } catch {
    return null
  }
}

function saveSessionToDisk(sid: string) {
  try {
    mkdirSync(SESSION_DIR(), { recursive: true })
    writeFileSync(SESSION_FILE(), JSON.stringify({ sid }))
  } catch {
    // Non-critical — session just won't survive restarts
  }
}

async function authenticate(): Promise<string> {
  // Deduplicate concurrent auth calls
  if (authInFlight) return authInFlight

  // If rate-limited / seats exhausted, fail fast
  if (Date.now() < rateLimitedUntil) {
    throw new Error('Pi-hole auth rate limited, backing off')
  }

  authInFlight = (async () => {
    try {
      const res = await fetch(`${PIHOLE_URL()}/api/auth`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: PIHOLE_PASSWORD() }),
      })
      if (res.status === 429) {
        // Seats exhausted or rate limited — back off 60s
        rateLimitedUntil = Date.now() + 60_000
        throw new Error('Pi-hole API seats exhausted, backing off for 60s')
      }
      if (!res.ok) throw new Error(`Pi-hole auth failed: ${res.status}`)
      const data = (await res.json()) as { session: { sid: string } }
      sessionSid = data.session.sid
      rateLimitedUntil = 0
      saveSessionToDisk(sessionSid)
      return sessionSid
    } finally {
      authInFlight = null
    }
  })()
  return authInFlight
}

async function piholeGet<T>(path: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    if (!sessionSid) await authenticate()

    const res = await fetch(`${PIHOLE_URL()}${path}`, {
      headers: { 'X-FTL-SID': sessionSid! },
    })

    if (res.status === 401) {
      sessionSid = null
      continue
    }
    if (!res.ok) throw new Error(`Pi-hole API error: ${res.status} on ${path}`)
    return (await res.json()) as T
  }
  throw new Error('Pi-hole authentication failed after retry')
}

/** Delete the current session from Pi-hole to free a seat */
export async function deletePiholeSession() {
  if (!sessionSid) return
  try {
    await fetch(`${PIHOLE_URL()}/api/auth`, {
      method: 'DELETE',
      headers: { 'X-FTL-SID': sessionSid },
    })
  } catch {
    // Best-effort cleanup
  }
  sessionSid = null
}

export interface PiholeStats {
  totalQueries: number
  blockedQueries: number
  blockedPercentage: number
  domainsOnBlocklist: number
  status: string
  blockedLastHour: number
  queriesLastHour: number
}

interface StatsResponse {
  queries: { total: number; blocked: number; percent_blocked: number }
  gravity: { domains_being_blocked: number }
}

interface BlockingResponse {
  blocking: string
}

interface HistoryEntry {
  timestamp: number
  total: number
  blocked: number
}

interface HistoryResponse {
  history: HistoryEntry[]
}

let lastStats: PiholeStats | null = null

export function _resetSession() {
  sessionSid = null
  authInFlight = null
  rateLimitedUntil = 0
  lastStats = null
}

/** Load persisted session from disk so we reuse it across restarts */
export function loadSession() {
  sessionSid = loadSessionFromDisk()
}

export async function fetchPiholeStats(): Promise<PiholeStats> {
  try {
    const [stats, blocking, history] = await Promise.all([
      piholeGet<StatsResponse>('/api/stats/summary'),
      piholeGet<BlockingResponse>('/api/dns/blocking'),
      piholeGet<HistoryResponse>('/api/history'),
    ])

    const oneHourAgo = Math.floor(Date.now() / 1000) - 3600
    let blockedLastHour = 0
    let queriesLastHour = 0
    if (history.history) {
      for (const entry of history.history) {
        if (entry.timestamp >= oneHourAgo) {
          queriesLastHour += entry.total
          blockedLastHour += entry.blocked
        }
      }
    }

    lastStats = {
      totalQueries: stats.queries.total,
      blockedQueries: stats.queries.blocked,
      blockedPercentage: stats.queries.percent_blocked,
      domainsOnBlocklist: stats.gravity.domains_being_blocked,
      status: blocking.blocking,
      blockedLastHour,
      queriesLastHour,
    }
    return lastStats
  } catch (err) {
    if (lastStats) return lastStats
    throw err
  }
}
