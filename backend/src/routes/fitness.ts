import { Router } from 'express'
import { fetchFitness } from '../services/fitnessService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const summary = await fetchFitness()
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

export default router
