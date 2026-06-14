import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'
import { windDirToDegrees } from '../utils/wind.js'

interface FluxFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables (lower these first if the Pi struggles) ──
const DENSITY_DIVISOR = 2600 // larger = fewer particles
const MIN_PARTICLES = 110
const MAX_PARTICLES = 260
const TARGET_FPS = 30
const FIELD_SCALE = 0.0016 // spatial frequency of the flow field (per CSS px)
const TIME_SCALE = 0.00018 // how fast the field evolves (per ms)
const FIELD_STRENGTH = 0.9 // radians of swirl the field adds to wind direction

interface Particle {
  x: number
  y: number
  px: number
  py: number
  life: number
  maxLife: number
  hueJitter: number
  lightJitter: number
  rain: boolean
}

/**
 * Map temperature (°F) to a base hue, walking a continuous (non-wrapping) scale
 * from cold indigo down through teal/green to warm amber and finally hot red.
 * Returned value may be negative; callers mod into 0..360.
 */
export function tempToHue(tempF: number): number {
  const stops: [temp: number, hue: number][] = [
    [25, 250],
    [40, 210],
    [55, 180],
    [68, 150],
    [82, 35],
    [95, -20],
  ]
  if (tempF <= stops[0][0]) return stops[0][1]
  if (tempF >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, h0] = stops[i]
    const [t1, h1] = stops[i + 1]
    if (tempF >= t0 && tempF <= t1) {
      const f = (tempF - t0) / (t1 - t0)
      return h0 + (h1 - h0) * f
    }
  }
  return stops[stops.length - 1][1]
}

interface Palette {
  bgFade: string
  hue: number
  sat: number
  light: number
  alpha: number
}

export function fluxPalette(tempF: number | null, dark: boolean): Palette {
  const hue = ((tempToHue(tempF ?? 60) % 360) + 360) % 360
  if (dark) {
    return { bgFade: 'rgba(6, 8, 16, 0.09)', hue, sat: 72, light: 62, alpha: 0.85 }
  }
  return { bgFade: 'rgba(244, 241, 234, 0.13)', hue, sat: 60, light: 48, alpha: 0.62 }
}

// Sum of incommensurate sines: a cheap, organic flow field with no obvious tiling
function flowAngle(x: number, y: number, t: number): number {
  return (
    (Math.sin(x * 1.1 + t) +
      Math.cos(y * 0.9 - t * 0.8) +
      Math.sin((x + y) * 0.7 + t * 0.5) +
      Math.cos((x - y) * 1.3 - t * 0.3)) *
    0.6
  )
}

export function FluxField({ weather, dark }: FluxFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)

  // Latest props for the animation loop to read without restarting it
  const weatherRef = useRef(weather)
  const darkRef = useRef(dark)
  useEffect(() => {
    weatherRef.current = weather
    darkRef.current = dark
  }, [weather, dark])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !size) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / no-canvas environments
    if (typeof requestAnimationFrame === 'undefined') return

    const dpr = size.width / (containerRef.current?.clientWidth || size.width) || 1
    canvas.width = size.width
    canvas.height = size.height
    const w = size.width
    const h = size.height
    ctx.scale(dpr, dpr)
    const cssW = w / dpr
    const cssH = h / dpr

    const count = Math.round(
      Math.min(MAX_PARTICLES, Math.max(MIN_PARTICLES, (cssW * cssH) / DENSITY_DIVISOR))
    )

    const spawn = (p: Particle, rainFrac: number) => {
      p.x = Math.random() * cssW
      p.y = Math.random() * cssH
      p.px = p.x
      p.py = p.y
      p.maxLife = 4 + Math.random() * 6
      p.life = p.maxLife
      p.hueJitter = (Math.random() - 0.5) * 40
      p.lightJitter = (Math.random() - 0.5) * 16
      p.rain = Math.random() < rainFrac
    }

    const particles: Particle[] = []
    for (let i = 0; i < count; i++) {
      const p: Particle = {
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        life: 0,
        maxLife: 0,
        hueJitter: 0,
        lightJitter: 0,
        rain: false,
      }
      spawn(p, 0)
      particles.push(p)
    }

    const frameInterval = 1000 / TARGET_FPS
    let raf = 0
    let last = performance.now()
    let acc = 0
    let elapsed = 0

    ctx.lineCap = 'round'

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const frameDt = Math.min(now - last, 100) // clamp after tab was backgrounded
      last = now
      acc += frameDt
      if (acc < frameInterval) return
      const dt = acc / 1000
      acc = 0
      elapsed += frameDt

      const wx = weatherRef.current?.current
      const isDark = darkRef.current
      const pal = fluxPalette(wx?.temp ?? null, isDark)

      const fromDeg = wx ? windDirToDegrees(wx.windDirection) : null
      // Wind reports the direction it comes FROM; particles blow toward FROM+180
      const baseAngle = fromDeg != null ? ((fromDeg + 180) * Math.PI) / 180 : 0
      const windSpeed = wx?.windSpeed ?? 0
      const gust = wx?.windGust ?? null
      const gustBoost = gust != null ? 1 + 0.35 * Math.max(0, Math.sin(elapsed * 0.0007)) : 1
      const speed = Math.min(140, Math.max(6, (8 + windSpeed * 2.0) * gustBoost))

      const precip = (weatherRef.current?.hourly?.[0]?.pop ?? 0) > 0.35 ? 0.28 : 0
      const t = elapsed * TIME_SCALE

      // Fade previous frame for trails (cheaper than tracking history)
      ctx.fillStyle = pal.bgFade
      ctx.fillRect(0, 0, cssW, cssH)
      ctx.lineWidth = 1.3

      for (const p of particles) {
        const angle =
          baseAngle + flowAngle(p.x * FIELD_SCALE, p.y * FIELD_SCALE, t) * FIELD_STRENGTH
        let vx = Math.cos(angle) * speed
        let vy = Math.sin(angle) * speed
        if (p.rain) {
          vx = vx * 0.2
          vy = Math.abs(vy) * 0.5 + 90 // bias strongly downward
        }
        p.px = p.x
        p.py = p.y
        p.x += vx * dt
        p.y += vy * dt
        p.life -= dt

        // Respawn on death or when leaving the canvas
        if (p.life <= 0 || p.x < -20 || p.x > cssW + 20 || p.y < -20 || p.y > cssH + 20) {
          spawn(p, precip)
          continue
        }

        if (p.rain) {
          ctx.strokeStyle = isDark ? 'rgba(200, 220, 255, 0.5)' : 'rgba(120, 150, 200, 0.45)'
        } else {
          const hue = (pal.hue + p.hueJitter + 360) % 360
          const light = Math.max(20, Math.min(85, pal.light + p.lightJitter))
          ctx.strokeStyle = `hsla(${hue}, ${pal.sat}%, ${light}%, ${pal.alpha})`
        }
        ctx.beginPath()
        ctx.moveTo(p.px, p.py)
        ctx.lineTo(p.x, p.y)
        ctx.stroke()
      }
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" />
    </div>
  )
}
