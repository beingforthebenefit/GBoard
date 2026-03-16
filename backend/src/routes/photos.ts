import { Router } from 'express'
import path from 'path'
import { fetchPhotos, getCacheDir } from '../services/photosService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const photos = await fetchPhotos()
    res.json({ photos })
  } catch (err) {
    next(err)
  }
})

// Serve cached photo files with caching headers
router.get('/image/:filename', (req, res) => {
  const filename = path.basename(req.params.filename) // prevent path traversal
  const filepath = path.join(getCacheDir(), filename)
  res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
  res.sendFile(filepath, (err) => {
    if (err) res.status(404).end()
  })
})

export default router
