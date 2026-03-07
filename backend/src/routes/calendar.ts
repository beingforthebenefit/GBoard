import { Router } from 'express'
import { fetchCalendarEvents } from '../services/calendarService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const events = await fetchCalendarEvents()
    res.json({ events })
  } catch (err) {
    next(err)
  }
})

export default router
