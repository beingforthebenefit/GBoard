import { Router } from 'express'
import { fetchHomeAssistant } from '../services/homeassistantService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const summary = await fetchHomeAssistant()
    res.json(summary)
  } catch (err) {
    next(err)
  }
})

export default router
