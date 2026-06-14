import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface AuroraFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables ──
// The field is drawn at a low internal resolution and the browser upscales the
// canvas smoothly — buttery gradients for a fraction of the fill cost on a Pi.
const RES_LONG = 380 // internal canvas long-side resolution in px
const BLOB_COUNT = 6
const TARGET_FPS = 30
const HUE_DRIFT = 0.0016 // base hue degrees per ms (full cycle ~3.7 min)
const TWO_PI = Math.PI * 2

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Anchor hue from temperature: cold blues → aurora green → violet → warm magenta */
export function tempToAnchorHue(tempF: number): number {
  const stops: [number, number][] = [
    [30, 210],
    [50, 160],
    [70, 280],
    [90, 320],
  ]
  if (tempF <= stops[0][0]) return stops[0][1]
  if (tempF >= stops[stops.length - 1][0]) return stops[stops.length - 1][1]
  for (let i = 0; i < stops.length - 1; i++) {
    const [t0, h0] = stops[i]
    const [t1, h1] = stops[i + 1]
    if (tempF >= t0 && tempF <= t1) return h0 + ((h1 - h0) * (tempF - t0)) / (t1 - t0)
  }
  return stops[stops.length - 1][1]
}

interface Palette {
  bg: string
  sat: number
  light: number
  alpha: number
  composite: GlobalCompositeOperation
  spread: number // hue spread across blobs
}

export function auroraPalette(dark: boolean): Palette {
  if (dark) {
    return { bg: '#04050a', sat: 85, light: 56, alpha: 0.55, composite: 'lighter', spread: 70 }
  }
  return { bg: '#f4f1ea', sat: 72, light: 55, alpha: 0.5, composite: 'multiply', spread: 48 }
}

interface Blob {
  ax: number // anchor x (0..1)
  ay: number // anchor y (0..1)
  ampx: number // drift amplitude (fraction of min dim)
  ampy: number
  fx: number // drift frequency (rad/ms)
  fy: number
  px: number // phase
  py: number
  baseR: number // radius (fraction of min dim)
  pr: number // pulse frequency
  pp: number // pulse phase
  squash: number // ellipse aspect (<1 = ribbon)
  angle: number // base orientation
  adrift: number // rotation speed (rad/ms)
  hueN: number // normalized hue position (-1..1)
  hueJit: number
}

function makeBlobs(count: number): Blob[] {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)
  const blobs: Blob[] = []
  for (let i = 0; i < count; i++) {
    blobs.push({
      ax: rnd(0.15, 0.85),
      ay: rnd(0.12, 0.88),
      ampx: rnd(0.12, 0.3),
      ampy: rnd(0.12, 0.3),
      fx: rnd(0.00006, 0.00017),
      fy: rnd(0.00006, 0.00017),
      px: rnd(0, TWO_PI),
      py: rnd(0, TWO_PI),
      baseR: rnd(0.4, 0.62),
      pr: rnd(0.00008, 0.0002),
      pp: rnd(0, TWO_PI),
      squash: rnd(0.42, 0.78),
      angle: rnd(0, TWO_PI),
      adrift: rnd(-0.00009, 0.00009),
      hueN: (i / Math.max(1, count - 1)) * 2 - 1,
      hueJit: rnd(-12, 12),
    })
  }
  return blobs
}

export function AuroraField({ weather, dark }: AuroraFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)
  const blobsRef = useRef<Blob[]>(makeBlobs(BLOB_COUNT))

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

    // Low internal resolution; CSS stretches the canvas to fill, smoothing it
    const aspect = size.width / size.height
    const w = aspect >= 1 ? RES_LONG : Math.round(RES_LONG * aspect)
    const h = aspect >= 1 ? Math.round(RES_LONG / aspect) : RES_LONG
    canvas.width = w
    canvas.height = h
    const minDim = Math.min(w, h)
    const blobs = blobsRef.current

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
      const pal = auroraPalette(darkRef.current)
      const windFactor = 1 + clamp((wx?.windSpeed ?? 0) / 35, 0, 1)
      const anchorHue = tempToAnchorHue(wx?.temp ?? 60) + elapsed * HUE_DRIFT

      ctx.globalCompositeOperation = 'source-over'
      ctx.fillStyle = pal.bg
      ctx.fillRect(0, 0, w, h)
      ctx.globalCompositeOperation = pal.composite

      for (const b of blobs) {
        const x = (b.ax + Math.sin(elapsed * b.fx * windFactor + b.px) * b.ampx) * w
        const y = (b.ay + Math.cos(elapsed * b.fy * windFactor + b.py) * b.ampy) * h
        const r = b.baseR * minDim * (1 + 0.18 * Math.sin(elapsed * b.pr + b.pp))
        const hue = (((anchorHue + b.hueN * pal.spread + b.hueJit) % 360) + 360) % 360

        ctx.save()
        ctx.translate(x, y)
        ctx.rotate(b.angle + elapsed * b.adrift)
        ctx.scale(1, b.squash)
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, r)
        grad.addColorStop(0, `hsla(${hue}, ${pal.sat}%, ${pal.light}%, ${pal.alpha})`)
        grad.addColorStop(1, `hsla(${hue}, ${pal.sat}%, ${pal.light}%, 0)`)
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.arc(0, 0, r, 0, TWO_PI)
        ctx.fill()
        ctx.restore()
      }
      ctx.globalCompositeOperation = 'source-over'
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
