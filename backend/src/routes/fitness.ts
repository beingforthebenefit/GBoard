import { Router } from 'express'
import { fetchFitness, fetchFitnessHistory } from '../services/fitnessService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const summary = await fetchFitness()
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

// Every recorded day of BP, weight, sleep and steps — the mobile view's chart explorer
router.get('/history', async (_req, res, next) => {
  try {
    res.json(await fetchFitnessHistory())
  } catch (err) {
    next(err)
  }
})

export default router
