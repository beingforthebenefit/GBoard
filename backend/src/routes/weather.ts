import { Router } from 'express'
import { fetchWeather } from '../services/weatherService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const data = await fetchWeather()
    res.json(data)
  } catch (err) {
    next(err)
  }
})

export default router
