import express from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import weatherRouter from './routes/weather.js'
import calendarRouter from './routes/calendar.js'
import plexRouter from './routes/plex.js'
import photosRouter from './routes/photos.js'
import piholeRouter from './routes/pihole.js'
import mediaRouter from './routes/media.js'
import { loadFromDisk, startSync, startPeriodicSync } from './services/photosService.js'
import { loadSession, deletePiholeSession } from './services/piholeService.js'

const app = express()
const PORT = 3001 // internal container port — BACKEND_PORT in .env only controls the host-side mapping
const STARTED_AT = Date.now()

app.use(express.json())

// CORS for local dev (Nginx handles this in production)
app.use((_req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

// Version endpoint — returns server startup time.
// When the frontend detects this value has changed, it reloads the page.
app.get('/api/version', (_req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
  res.setHeader('Pragma', 'no-cache')
  res.setHeader('Expires', '0')
  res.setHeader('Surrogate-Control', 'no-store')
  res.json({ startedAt: STARTED_AT })
})

app.use('/api/weather', weatherRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/plex', plexRouter)
app.use('/api/photos', photosRouter)
app.use('/api/pihole', piholeRouter)
app.use('/api/media', mediaRouter)

app.use(errorHandler)

// Clean up Pi-hole session on shutdown to free API seat
for (const sig of ['SIGINT', 'SIGTERM'] as const) {
  process.on(sig, () => {
    deletePiholeSession().finally(() => process.exit(0))
  })
}

app.listen(PORT, () => {
  console.log(`[GBoard API] listening on port ${PORT}`)

  // Restore Pi-hole session from previous run
  loadSession()

  // Load cached photos from disk instantly, then sync with iCloud in background
  loadFromDisk()
    .then((urls) => {
      if (urls.length > 0) {
        console.log(`[GBoard API] loaded ${urls.length} photos from disk cache`)
      } else {
        console.log(`[GBoard API] no disk cache found, will fetch from iCloud`)
      }
      // Sync with iCloud in background (downloads new photos)
      startSync().catch((err) => console.error(`[GBoard API] photo sync failed:`, err))
      // Re-sync periodically to pick up new photos
      startPeriodicSync()
    })
    .catch((err) => console.error(`[GBoard API] photo cache load failed:`, err))
})

export default app
