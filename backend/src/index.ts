import express from 'express'
import { errorHandler } from './middleware/errorHandler.js'
import weatherRouter from './routes/weather.js'
import calendarRouter from './routes/calendar.js'
import plexRouter from './routes/plex.js'
import photosRouter from './routes/photos.js'

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
  res.json({ startedAt: STARTED_AT })
})

app.use('/api/weather', weatherRouter)
app.use('/api/calendar', calendarRouter)
app.use('/api/plex', plexRouter)
app.use('/api/photos', photosRouter)

app.use(errorHandler)

app.listen(PORT, () => {
  console.log(`[GBoard API] listening on port ${PORT}`)
})

export default app
