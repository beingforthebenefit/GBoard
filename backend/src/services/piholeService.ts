const PIHOLE_URL = () => process.env.PIHOLE_URL || 'http://192.168.50.62'
const PIHOLE_PASSWORD = () => process.env.PIHOLE_PASSWORD || ''

let sessionSid: string | null = null

async function authenticate(): Promise<string> {
  const res = await fetch(`${PIHOLE_URL()}/api/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: PIHOLE_PASSWORD() }),
  })
  if (!res.ok) throw new Error(`Pi-hole auth failed: ${res.status}`)
  const data = (await res.json()) as { session: { sid: string } }
  sessionSid = data.session.sid
  return sessionSid
}

async function piholeGet<T>(path: string): Promise<T> {
  // Try with existing session, re-auth on 401
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

export interface PiholeStats {
  totalQueries: number
  blockedQueries: number
  blockedPercentage: number
  domainsOnBlocklist: number
  status: string
  // History for "last hour" calculation
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

export function _resetSession() {
  sessionSid = null
}

export async function fetchPiholeStats(): Promise<PiholeStats> {
  const [stats, blocking, history] = await Promise.all([
    piholeGet<StatsResponse>('/api/stats/summary'),
    piholeGet<BlockingResponse>('/api/dns/blocking'),
    piholeGet<HistoryResponse>('/api/history'),
  ])

  // Sum entries from the last hour
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

  return {
    totalQueries: stats.queries.total,
    blockedQueries: stats.queries.blocked,
    blockedPercentage: stats.queries.percent_blocked,
    domainsOnBlocklist: stats.gravity.domains_being_blocked,
    status: blocking.blocking,
    blockedLastHour,
    queriesLastHour,
  }
}
