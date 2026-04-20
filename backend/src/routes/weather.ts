import { Router } from 'express'
import { fetchWeather } from '../services/weatherService.js'
import { getRadarData, getFramePath, proxyTile } from '../services/radarService.js'

const router = Router()

router.get('/', async (_req, res, next) => {
  try {
    const data = await fetchWeather()
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/radar', async (_req, res, next) => {
  try {
    const data = await getRadarData()
    res.json(data)
  } catch (err) {
    next(err)
  }
})

router.get('/radar/base/:z/:x/:y', async (req, res, next) => {
  try {
    const { z, x, y } = req.params
    const url = `https://basemaps.cartocdn.com/dark_all/${z}/${x}/${y}.png`
    const { buffer, contentType } = await proxyTile(url)
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=3600')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
})

router.get('/radar/overlay/:z/:x/:y', async (req, res, next) => {
  try {
    const { z, x, y } = req.params
    const data = await getRadarData()
    const frameIdx = req.query.frame != null ? parseInt(String(req.query.frame), 10) : NaN
    const path = Number.isFinite(frameIdx) ? getFramePath(frameIdx) : data.radarPath
    if (!path) return res.status(404).send()
    const url = `${data.host}${path}/256/${z}/${x}/${y}/6/0_1.png`
    const { buffer, contentType } = await proxyTile(url)
    res.set('Content-Type', contentType)
    res.set('Cache-Control', 'public, max-age=300')
    res.send(buffer)
  } catch (err) {
    next(err)
  }
})

export default router
