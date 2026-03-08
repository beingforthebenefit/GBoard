import { Router } from 'express'
import { fetchPiholeStats } from '../services/piholeService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const stats = await fetchPiholeStats()
    res.json(stats)
  } catch (err) {
    next(err)
  }
})

export default router
