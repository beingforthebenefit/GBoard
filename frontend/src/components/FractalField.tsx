import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface FractalFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables (lower LAYERS / TARGET_FPS first if the Pi struggles) ──
const F = 2.0 // scale ratio between octaves; the motif fills the annulus [1, F]
const LAYERS = 10 // octave copies drawn per frame
const MIN_SCALE = 3 // px scale of the smallest (newest) octave
const LINE_PX = 1.4 // stroke width in screen px
const TARGET_FPS = 30
const ZOOM_OCTAVE_MS = 7000 // time to zoom through one full octave (×2)
const ROT_PER_OCTAVE = 0.42 // radians of twist per octave (Droste spiral)
const HUE_DRIFT = 0.003 // base hue degrees per ms
const HUE_PER_OCTAVE = 9 // small hue shift between depths for a sense of depth
const TWO_PI = Math.PI * 2

// Fade octaves in at the center and out at the edges so recycling is invisible
const FADE_IN = 1.5
const FADE_OUT_START = LAYERS - 2.6
const FADE_OUT_END = LAYERS - 0.5

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function octaveSeed(octave: number, salt: number): number {
  let h = Math.imul(octave ^ salt, 2654435761)
  h = Math.imul(h ^ (h >>> 15), 246822519)
  return (h ^ (h >>> 13)) >>> 0
}

export interface Motif {
  sides: number // sides of the nested polygon shells (3..7)
  shells: number[] // radii in [1, F] — drawing the same shape repeatedly nests it across octaves
  shellTwist: number // rotation between successive shells (spiral)
  arms: number // satellite count around the ring (0 = none)
  satR: number // satellite ring radius in [1, F]
  satSides: number // 0 = circle, else polygon sides
  satSize: number // satellite size as a fraction of its radius
  spokes: boolean // radial rays spanning the annulus (line octaves into a tunnel)
}

// One motif, repeated at every octave — self-similarity is what reads as "fractal".
// Seeded per page load so the pattern is different each time.
export function makeMotif(seed: number): Motif {
  const rng = mulberry32(seed)
  const shellCount = rng() < 0.5 ? 3 : 2
  const shells: number[] = []
  for (let i = 0; i < shellCount; i++) {
    // Spread shells across the annulus so consecutive octaves nest with no gaps
    shells.push(1.0 + (i / shellCount) * (F - 1.0) + (rng() - 0.5) * 0.08)
  }
  return {
    sides: 3 + Math.floor(rng() * 5),
    shells,
    shellTwist: (rng() - 0.5) * 0.6,
    arms: rng() < 0.75 ? 5 + Math.floor(rng() * 6) : 0,
    satR: 1.15 + rng() * (F - 1.3),
    satSides: rng() < 0.4 ? 0 : 3 + Math.floor(rng() * 4),
    satSize: 0.07 + rng() * 0.08,
    spokes: rng() < 0.55,
  }
}

interface Palette {
  bg: string
  sat: number
  light: number
}

export function fractalPalette(dark: boolean): Palette {
  if (dark) return { bg: '#05060a', sat: 70, light: 62 }
  return { bg: '#efeae0', sat: 55, light: 38 }
}

function polygon(ctx: CanvasRenderingContext2D, r: number, sides: number, rot: number) {
  ctx.beginPath()
  for (let k = 0; k < sides; k++) {
    const a = (k / sides) * TWO_PI + rot
    const x = Math.cos(a) * r
    const y = Math.sin(a) * r
    if (k === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.stroke()
}

function drawMotif(
  ctx: CanvasRenderingContext2D,
  m: Motif,
  scale: number,
  hue: number,
  pal: Palette
) {
  ctx.lineWidth = LINE_PX / scale
  const solid = `hsl(${hue}, ${pal.sat}%, ${pal.light}%)`
  const faint = `hsla(${hue}, ${pal.sat}%, ${pal.light}%, 0.32)`

  if (m.spokes) {
    ctx.strokeStyle = faint
    const inner = m.shells[0] * 0.92
    const outer = m.shells[m.shells.length - 1] * 1.04
    for (let a = 0; a < m.sides; a++) {
      const ang = (a / m.sides) * TWO_PI
      ctx.beginPath()
      ctx.moveTo(Math.cos(ang) * inner, Math.sin(ang) * inner)
      ctx.lineTo(Math.cos(ang) * outer, Math.sin(ang) * outer)
      ctx.stroke()
    }
  }

  // Nested polygon shells — the same shape at multiple radii reads as recursion
  ctx.strokeStyle = solid
  for (let si = 0; si < m.shells.length; si++) {
    polygon(ctx, m.shells[si], m.sides, m.shellTwist * si)
  }

  // Satellites around the ring for finer detail
  if (m.arms > 0) {
    const er = m.satSize * m.satR
    for (let a = 0; a < m.arms; a++) {
      const ang = (a / m.arms) * TWO_PI
      const ex = Math.cos(ang) * m.satR
      const ey = Math.sin(ang) * m.satR
      ctx.beginPath()
      if (m.satSides === 0) {
        ctx.arc(ex, ey, er, 0, TWO_PI)
      } else {
        for (let k = 0; k < m.satSides; k++) {
          const pa = (k / m.satSides) * TWO_PI + ang
          const px = ex + Math.cos(pa) * er
          const py = ey + Math.sin(pa) * er
          if (k === 0) ctx.moveTo(px, py)
          else ctx.lineTo(px, py)
        }
        ctx.closePath()
      }
      ctx.stroke()
    }
  }
}

export function FractalField({ weather, dark }: FractalFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)
  const saltRef = useRef(Math.floor(Math.random() * 2 ** 31))

  const weatherRef = useRef(weather)
  const darkRef = useRef(dark)
  useEffect(() => {
    weatherRef.current = weather
    darkRef.current = dark
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
    const cx = cssW / 2
    const cy = cssH / 2

    // One self-similar motif for the whole zoom; different each page load
    const motif = makeMotif(octaveSeed(0, saltRef.current))

    ctx.lineJoin = 'round'
    const frameInterval = 1000 / TARGET_FPS
    let raf = 0
    let last = performance.now()
    let acc = 0
    let elapsed = 0

    const step = (now: number) => {
      raf = requestAnimationFrame(step)
      const frameDt = Math.min(now - last, 100)
      last = now
      acc += frameDt
      if (acc < frameInterval) return
      acc = 0
      elapsed += frameInterval

      const wx = weatherRef.current?.current
      const isDark = darkRef.current
      const pal = fractalPalette(isDark)

      const windFactor = 1 + clamp((wx?.windSpeed ?? 0) / 40, 0, 0.8)
      const tempTint = clamp((60 - (wx?.temp ?? 60)) * 0.4, -22, 22)
      const globalZoom = (elapsed / ZOOM_OCTAVE_MS) * windFactor
      const baseOct = Math.floor(globalZoom)
      const frac = globalZoom - baseOct
      const hueBase = elapsed * HUE_DRIFT + tempTint

      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, cssW, cssH)

      for (let j = 0; j < LAYERS; j++) {
        const e = j + frac
        const opacity =
          smoothstep(0, FADE_IN, e) * (1 - smoothstep(FADE_OUT_START, FADE_OUT_END, e))
        if (opacity <= 0.01) continue
        const octave = baseOct + j
        const scale = MIN_SCALE * Math.pow(F, e)
        const rot = ROT_PER_OCTAVE * (globalZoom + j)
        const hue = (((hueBase + octave * HUE_PER_OCTAVE) % 360) + 360) % 360

        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(rot)
        ctx.scale(scale, scale)
        ctx.globalAlpha = opacity
        drawMotif(ctx, motif, scale, hue, pal)
        ctx.restore()
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
