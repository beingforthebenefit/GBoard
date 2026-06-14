import { Router } from 'express'
import { getWordOfDay } from '../services/wordService.js'

const router = Router()

router.get('/', (_req, res) => {
  res.json(getWordOfDay())
})

export default router
