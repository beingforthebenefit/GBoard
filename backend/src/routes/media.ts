import { Router } from 'express'
import { fetchUpcomingMedia } from '../services/mediaService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const result = await fetchUpcomingMedia()
    res.json(result)
  } catch (err) {
    next(err)
  }
})

export default router
