import { Router } from 'express'
import { fetchPlexSession } from '../services/plexService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const session = await fetchPlexSession()
    res.json({ session })
  } catch (err) {
    next(err)
  }
})

// Proxy Plex thumbnails — keeps the token server-side
router.get('/thumb', async (req, res, next) => {
  try {
    const plexUrl = process.env.PLEX_URL
    const plexToken = process.env.PLEX_TOKEN

    if (!plexUrl || !plexToken) {
      res.status(500).json({ error: 'Plex not configured' })
      return
    }

    const thumbPath = req.query.path as string
    if (!thumbPath || !thumbPath.startsWith('/')) {
      res.status(400).json({ error: 'Invalid path' })
      return
    }

    const upstream = await fetch(`${plexUrl}${thumbPath}?X-Plex-Token=${plexToken}`, {
      signal: AbortSignal.timeout(5000),
    })

    if (!upstream.ok) {
      res.status(upstream.status).end()
      return
    }

    const contentType = upstream.headers.get('content-type') ?? 'image/jpeg'
    res.setHeader('Content-Type', contentType)
    res.setHeader('Cache-Control', 'public, max-age=3600')

    const buffer = await upstream.arrayBuffer()
    res.send(Buffer.from(buffer))
  } catch (err) {
    next(err)
  }
})

export default router
