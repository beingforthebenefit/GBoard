import { Router } from 'express'
import { fetchUpcomingMedia } from '../services/mediaService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const items = await fetchUpcomingMedia()
    res.json({ items })
  } catch (err) {
    next(err)
  }
})

export default router
