import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

const PIHOLE_URL = () => process.env.PIHOLE_URL || 'http://192.168.50.62'
const PIHOLE_PASSWORD = () => process.env.PIHOLE_PASSWORD || ''
const PIHOLE_CLIENT_ALIASES = () => process.env.PIHOLE_CLIENT_ALIASES || ''
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
  clients: PiholeClient[]
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

export interface PiholeClient {
  name: string
  ip: string
  queries: number
  blockedQueries: number
  blockedPercentage: number
}

interface ClientsResponseItem {
  name: string
  ip: string
  count: number
}

interface ClientsResponse {
  clients: ClientsResponseItem[]
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

function normalizeClients(raw: unknown): PiholeClient[] {
  if (!raw || typeof raw !== 'object') return []

  const asAny = raw as Record<string, unknown>

  // Pi-hole v6 style: { clients: [{ name, ip, count }] }
  if (Array.isArray(asAny.clients)) {
    return asAny.clients
      .map((item) => {
        if (!item || typeof item !== 'object') return null
        const entry = item as Record<string, unknown>
        const ip = typeof entry.ip === 'string' ? entry.ip : ''
        const fallbackName = ip || 'Unknown client'
        const name = typeof entry.name === 'string' && entry.name.trim() ? entry.name : fallbackName
        const countRaw = entry.count
        const queries = typeof countRaw === 'number' ? countRaw : 0
        if (!ip && !name) return null
        return {
          name,
          ip: ip || fallbackName,
          queries,
          blockedQueries: 0,
          blockedPercentage: 0,
        }
      })
      .filter((item): item is PiholeClient => item !== null)
  }

  // Legacy shape fallback: { top_sources: { "<ip-or-host>": count } }
  if (
    asAny.top_sources &&
    typeof asAny.top_sources === 'object' &&
    !Array.isArray(asAny.top_sources)
  ) {
    return Object.entries(asAny.top_sources as Record<string, unknown>)
      .map(([key, value]) => ({
        name: key,
        ip: key,
        queries: typeof value === 'number' ? value : 0,
        blockedQueries: 0,
        blockedPercentage: 0,
      }))
      .filter((item) => item.queries > 0)
  }

  return []
}

function parseClientAliases(raw: string): Record<string, string> {
  if (!raw.trim()) return {}

  const aliases: Record<string, string> = {}
  for (const part of raw.split(',')) {
    const entry = part.trim()
    if (!entry) continue
    const eq = entry.indexOf('=')
    if (eq <= 0) continue

    const key = entry.slice(0, eq).trim().toLowerCase()
    let value = entry.slice(eq + 1).trim()
    if (!key || !value) continue
    value = value.replace(/^['"]/, '').replace(/['"]$/, '').trim()
    if (!value) continue

    aliases[key] = value
  }

  return aliases
}

function applyClientAlias(client: PiholeClient, aliases: Record<string, string>): PiholeClient {
  const byIp = aliases[client.ip.toLowerCase()]
  if (byIp) return { ...client, name: byIp }

  const byName = aliases[client.name.toLowerCase()]
  if (byName) return { ...client, name: byName }

  return client
}

function applyBlockedClientStats(clients: PiholeClient[], blockedRaw: unknown): PiholeClient[] {
  const blockedByKey = new Map<string, number>()
  for (const client of normalizeClients(blockedRaw)) {
    if (client.ip) blockedByKey.set(client.ip.toLowerCase(), client.queries)
    if (client.name) blockedByKey.set(client.name.toLowerCase(), client.queries)
  }

  return clients.map((client) => {
    const blockedQueries =
      blockedByKey.get(client.ip.toLowerCase()) ?? blockedByKey.get(client.name.toLowerCase()) ?? 0
    const blockedPercentage = client.queries > 0 ? (blockedQueries / client.queries) * 100 : 0

    return {
      ...client,
      blockedQueries,
      blockedPercentage,
    }
  })
}

function isFilteredClient(client: PiholeClient): boolean {
  const name = client.name.toLowerCase()
  const ip = client.ip.toLowerCase()

  if (name === 'pi.hole') return true
  if (name === 'localhost' || name.startsWith('localhost.')) return true
  if (ip === '::') return true
  if (ip === '127.0.0.1' || ip.startsWith('127.') || ip === '::1' || ip === '[::1]') return true

  return false
}

export async function fetchPiholeStats(): Promise<PiholeStats> {
  try {
    const [stats, blocking, history, clientsRaw, blockedClientsRaw] = await Promise.all([
      piholeGet<StatsResponse>('/api/stats/summary'),
      piholeGet<BlockingResponse>('/api/dns/blocking'),
      piholeGet<HistoryResponse>('/api/history'),
      piholeGet<ClientsResponse | Record<string, unknown>>('/api/stats/top_clients?count=8').catch(
        () => null
      ),
      piholeGet<ClientsResponse | Record<string, unknown>>(
        '/api/stats/top_clients?count=8&blocked=true'
      ).catch(() =>
        piholeGet<ClientsResponse | Record<string, unknown>>(
          '/api/stats/top_clients_blocked?count=8'
        ).catch(() => null)
      ),
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

    const aliases = parseClientAliases(PIHOLE_CLIENT_ALIASES())

    const clients = applyBlockedClientStats(
      normalizeClients(clientsRaw)
        .map((client) => applyClientAlias(client, aliases))
        .filter((client) => !isFilteredClient(client))
        .sort((a, b) => b.queries - a.queries)
        .slice(0, 5),
      blockedClientsRaw
    )

    lastStats = {
      totalQueries: stats.queries.total,
      blockedQueries: stats.queries.blocked,
      blockedPercentage: stats.queries.percent_blocked,
      domainsOnBlocklist: stats.gravity.domains_being_blocked,
      status: blocking.blocking,
      blockedLastHour,
      queriesLastHour,
      clients,
    }
    return lastStats
  } catch (err) {
    if (lastStats) return lastStats
    throw err
  }
}
