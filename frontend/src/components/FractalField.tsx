import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface FractalFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables (lower LAYERS / TARGET_FPS first if the Pi struggles) ──
const F = 2.0 // scale ratio between octaves; the motif fills the annulus [1, F]
const LAYERS = 9 // octave copies drawn per frame
const MIN_SCALE = 3 // px scale of the smallest (newest) octave
const LINE_PX = 1.3 // stroke width in screen px
const TARGET_FPS = 30
const ZOOM_OCTAVE_MS = 7000 // time to zoom through one full octave (×2)
const ROT_PER_OCTAVE = 0.38 // radians of twist per octave (Droste spiral)
const HUE_DRIFT = 0.003 // base hue degrees per ms
const HUE_PER_OCTAVE = 18 // hue offset between depths for color depth
const TWO_PI = Math.PI * 2

// Fade octaves in at the center and out at the edges so recycling is invisible
const FADE_IN = 1.4
const FADE_OUT_START = LAYERS - 2.4
const FADE_OUT_END = LAYERS - 0.5

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

function smoothstep(a: number, b: number, x: number): number {
  const t = clamp((x - a) / (b - a), 0, 1)
  return t * t * (3 - 2 * t)
}

// Deterministic per-octave PRNG so a given depth always renders the same motif
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
  arms: number
  sides: number // 0 = circle, else polygon sides
  ringRs: number[]
  elem: number
  twist: number
  connect: boolean
  ringCircle: boolean
  hueOffset: number
}

export function makeMotif(seed: number): Motif {
  const rng = mulberry32(seed)
  const rings = rng() < 0.5 ? 2 : 1
  const ringRs: number[] = []
  for (let i = 0; i < rings; i++) {
    const r = (rings === 1 ? 1.5 : 1.28 + i * 0.46) + (rng() - 0.5) * 0.14
    ringRs.push(r)
  }
  return {
    arms: 3 + Math.floor(rng() * 6),
    sides: rng() < 0.4 ? 0 : 3 + Math.floor(rng() * 4),
    ringRs,
    elem: 0.12 + rng() * 0.16,
    twist: (rng() - 0.5) * 0.7,
    connect: rng() < 0.55,
    ringCircle: rng() < 0.55,
    hueOffset: rng() * 70 - 35,
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

function drawMotif(
  ctx: CanvasRenderingContext2D,
  m: Motif,
  scale: number,
  hue: number,
  pal: Palette
) {
  ctx.lineWidth = LINE_PX / scale
  const solid = `hsl(${hue}, ${pal.sat}%, ${pal.light}%)`
  const faint = `hsla(${hue}, ${pal.sat}%, ${pal.light}%, 0.4)`

  if (m.connect) {
    ctx.strokeStyle = faint
    for (let a = 0; a < m.arms; a++) {
      const ang = (a / m.arms) * TWO_PI
      ctx.beginPath()
      ctx.moveTo(Math.cos(ang) * 1.02, Math.sin(ang) * 1.02)
      ctx.lineTo(Math.cos(ang) * (F * 0.99), Math.sin(ang) * (F * 0.99))
      ctx.stroke()
    }
  }

  for (let ri = 0; ri < m.ringRs.length; ri++) {
    const rr = m.ringRs[ri]
    if (m.ringCircle) {
      ctx.strokeStyle = faint
      ctx.beginPath()
      ctx.arc(0, 0, rr, 0, TWO_PI)
      ctx.stroke()
    }
    ctx.strokeStyle = solid
    const er = m.elem * rr
    for (let a = 0; a < m.arms; a++) {
      const ang = (a / m.arms) * TWO_PI + m.twist * ri
      const ex = Math.cos(ang) * rr
      const ey = Math.sin(ang) * rr
      ctx.beginPath()
      if (m.sides === 0) {
        ctx.arc(ex, ey, er, 0, TWO_PI)
      } else {
        for (let k = 0; k < m.sides; k++) {
          const pa = (k / m.sides) * TWO_PI + ang
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
    const salt = saltRef.current

    // Cache motifs by octave (deterministic, so clearing is free)
    const motifs = new Map<number, Motif>()
    const getMotif = (octave: number) => {
      let m = motifs.get(octave)
      if (!m) {
        m = makeMotif(octaveSeed(octave, salt))
        motifs.set(octave, m)
        if (motifs.size > LAYERS + 12) motifs.clear()
      }
      return m
    }

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

      // Windier weather descends faster; temperature tints the base hue
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
        const motif = getMotif(octave)
        const hue = (((hueBase + octave * HUE_PER_OCTAVE + motif.hueOffset) % 360) + 360) % 360

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
