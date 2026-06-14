import { useEffect, useRef } from 'react'
import { WeatherData, PlexSession } from '../types/index.js'
import { PiholeStats } from '../hooks/usePihole.js'
import { useElementSize } from '../hooks/useElementSize.js'
import { windDirToDegrees } from '../utils/wind.js'

interface MosaicFieldProps {
  weather: WeatherData | null
  piholeData: PiholeStats | null
  sessions: PlexSession[]
  dark: boolean
  /** Shimmer multiplier (>1 near a milestone) */
  shimmer: number
}

// ── Tunables (lower TARGET_CELLS / TARGET_FPS first if the Pi struggles) ──
const TARGET_CELLS = 240 // hex count is held roughly constant across resolutions
const TARGET_FPS = 30
const INSET = 0.9 // hex draw size vs grid spacing (gap between tiles)
const SPATIAL = 0.012 // gradient spatial frequency (per CSS px)
const BASE_FLOW = 0.00026 // gradient drift speed (per ms) with no wind
const WIND_FLOW = 0.000016 // extra drift per mph
const HUE_RANGE = 26 // degrees of hue swing across the gradient wave

// Ripples (Pi-hole / Plex / hourly pulses)
const RIPPLE_SPEED = 0.22 // px per ms
const RIPPLE_LIFE_MS = 5200
const RIPPLE_WIDTH = 46 // px thickness of the ring
const RIPPLE_LIGHT = 28 // lightness boost at the crest
const MAX_RIPPLES = 8
const AMBIENT_MS = 4500 // idle cadence of ambient ripples
const AMBIENT_PLAYING_MS = 2200 // livelier cadence while Plex plays
const HUE_CYCLE_HOURS = 12 // base hue completes a full rotation this often (~30°/hr)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

export function timeHue(date: Date, cycleHours = HUE_CYCLE_HOURS): number {
  // Base hue tracks the time of day, so the palette visibly shifts each hour
  const hours = date.getHours() + date.getMinutes() / 60 + date.getSeconds() / 3600
  return ((((hours / cycleHours) * 360) % 360) + 360) % 360
}

interface Palette {
  bg: string
  sat: number
  light: number
  lightAmp: number
}

export function mosaicPalette(dark: boolean): Palette {
  if (dark) return { bg: '#06060b', sat: 58, light: 44, lightAmp: 13 }
  return { bg: '#e9e3d6', sat: 46, light: 70, lightAmp: 11 }
}

interface Ripple {
  x: number
  y: number
  born: number
  intensity: number
}

export function MosaicField({ weather, piholeData, sessions, dark, shimmer }: MosaicFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)

  // Latest props for the loop to read without restarting it
  const weatherRef = useRef(weather)
  const piholeRef = useRef(piholeData)
  const sessionsRef = useRef(sessions)
  const darkRef = useRef(dark)
  const shimmerRef = useRef(shimmer)
  useEffect(() => {
    weatherRef.current = weather
    piholeRef.current = piholeData
    sessionsRef.current = sessions
    darkRef.current = dark
    shimmerRef.current = shimmer
  })

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !size) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return // jsdom / no-canvas environments
    if (typeof requestAnimationFrame === 'undefined') return

    const dpr = size.width / (containerRef.current?.clientWidth || size.width) || 1
    canvas.width = size.width
    canvas.height = size.height
    ctx.scale(dpr, dpr)
    const cssW = size.width / dpr
    const cssH = size.height / dpr

    // Hold cell count ~constant regardless of resolution → predictable Pi load
    const s = Math.sqrt((cssW * cssH) / (1.5 * Math.sqrt(3) * TARGET_CELLS))
    const hx = Math.sqrt(3) * s // column spacing (pointy-top)
    const vy = 1.5 * s // row spacing
    const cols = Math.ceil(cssW / hx) + 2
    const rows = Math.ceil(cssH / vy) + 2

    // Precompute every cell's center, vertices and phase seed once
    const cx: number[] = []
    const cy: number[] = []
    const seeds: number[] = []
    const verts: number[] = [] // flat: 12 numbers per cell
    const corners: [number, number][] = []
    for (let k = 0; k < 6; k++) {
      const a = ((60 * k - 30) * Math.PI) / 180
      corners.push([Math.cos(a) * s * INSET, Math.sin(a) * s * INSET])
    }
    for (let r = -1; r < rows; r++) {
      for (let c = -1; c < cols; c++) {
        const x = c * hx + (r & 1 ? hx / 2 : 0)
        const y = r * vy
        cx.push(x)
        cy.push(y)
        seeds.push(Math.random() * Math.PI * 2)
        for (let k = 0; k < 6; k++) {
          verts.push(x + corners[k][0], y + corners[k][1])
        }
      }
    }
    const cellCount = cx.length

    const ripples: Ripple[] = []
    const addRipple = (x: number, y: number, intensity: number, now: number) => {
      ripples.push({ x, y, born: now, intensity })
      if (ripples.length > MAX_RIPPLES) ripples.shift()
    }

    const frameInterval = 1000 / TARGET_FPS
    let raf = 0
    let last = performance.now()
    let acc = 0
    let elapsed = 0
    let ambientAcc = 0
    let prevBlocked = piholeRef.current?.blockedQueries ?? null
    let prevHour = new Date().getHours()

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const frameDt = Math.min(now - last, 100)
      last = now
      acc += frameDt
      if (acc < frameInterval) return
      const dt = acc
      acc = 0
      elapsed += dt

      const wx = weatherRef.current?.current
      const isDark = darkRef.current
      const pal = mosaicPalette(isDark)
      const playing = sessionsRef.current.length > 0

      // Pi-hole: a jump in blocked queries radiates a ripple from the center
      const blocked = piholeRef.current?.blockedQueries ?? null
      if (blocked != null && prevBlocked != null && blocked > prevBlocked) {
        const delta = blocked - prevBlocked
        addRipple(cssW / 2, cssH / 2, clamp(0.6 + delta / 40, 0.6, 1.6), now)
      }
      if (blocked != null) prevBlocked = blocked

      // On the hour, a big sweep from the center
      const hour = new Date().getHours()
      if (hour !== prevHour) {
        prevHour = hour
        addRipple(cssW / 2, cssH / 2, 1.8, now)
      }

      // Ambient ripples keep it alive; faster while something is playing
      ambientAcc += dt
      const ambientEvery = playing ? AMBIENT_PLAYING_MS : AMBIENT_MS
      if (ambientAcc >= ambientEvery) {
        ambientAcc = 0
        const i = (Math.random() * cellCount) | 0
        addRipple(cx[i], cy[i], 0.7, now)
      }

      // Drop expired ripples
      for (let i = ripples.length - 1; i >= 0; i--) {
        if (now - ripples[i].born > RIPPLE_LIFE_MS) ripples.splice(i, 1)
      }

      // Gradient flow parameters
      const temp = wx?.temp ?? 60
      const tempTint = clamp((60 - temp) * 0.4, -22, 22)
      const fromDeg = wx ? windDirToDegrees(wx.windDirection) : null
      const blowTo = fromDeg != null ? ((fromDeg + 180) * Math.PI) / 180 : Math.PI / 4
      const dirX = Math.cos(blowTo)
      const dirY = Math.sin(blowTo)
      const flow = elapsed * (BASE_FLOW + (wx?.windSpeed ?? 0) * WIND_FLOW)
      const accent = timeHue(new Date())
      const shim = shimmerRef.current

      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, cssW, cssH)

      for (let i = 0; i < cellCount; i++) {
        const wave = Math.sin((cx[i] * dirX + cy[i] * dirY) * SPATIAL - flow + seeds[i])
        let light = pal.light + wave * pal.lightAmp

        // Accumulate ripple contributions
        let rip = 0
        for (let j = 0; j < ripples.length; j++) {
          const rp = ripples[j]
          const age = now - rp.born
          const radius = age * RIPPLE_SPEED
          const dx = cx[i] - rp.x
          const dy = cy[i] - rp.y
          const band = Math.sqrt(dx * dx + dy * dy) - radius
          const env = 1 - age / RIPPLE_LIFE_MS
          if (env > 0) {
            rip += Math.exp(-(band * band) / (RIPPLE_WIDTH * RIPPLE_WIDTH)) * env * rp.intensity
          }
        }
        light = clamp(light + rip * RIPPLE_LIGHT, 6, 92)
        const hue = (((accent + tempTint + wave * HUE_RANGE * shim) % 360) + 360) % 360
        const sat = clamp(pal.sat + rip * 16, 0, 100)

        ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`
        const base = i * 12
        ctx.beginPath()
        ctx.moveTo(verts[base], verts[base + 1])
        for (let k = 1; k < 6; k++) {
          ctx.lineTo(verts[base + k * 2], verts[base + k * 2 + 1])
        }
        ctx.closePath()
        ctx.fill()
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
