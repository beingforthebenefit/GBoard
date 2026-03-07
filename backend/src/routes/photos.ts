import { Router } from 'express'
import { fetchPhotos } from '../services/photosService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const photos = await fetchPhotos()
    res.json({ photos })
  } catch (err) {
    next(err)
  }
})

export default router
