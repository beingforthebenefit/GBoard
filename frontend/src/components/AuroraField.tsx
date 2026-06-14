import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface AuroraFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables ──
// Metaballs are a per-pixel scalar field. SVG/GPU filters are too slow on the Pi,
// so we compute the field in JS on a small canvas and let the browser bilinear-
// upscale it (a cheap GPU texture scale). A wide, soft blob skin keeps the upscale
// smooth (no stairstepping); dither is applied only inside blobs so black stays pure.
const RES_LONG = 340 // internal field resolution (long side, px)
const BLOB_COUNT = 6
const TARGET_FPS = 30
const HUE_DRIFT = 0.0016 // base hue degrees per ms (full cycle ~3.7 min)
const SKIN_LO = 0.45 // field value where the soft skin begins
const SKIN_HI = 1.05 // field value where the blob is fully opaque
const CORE_BOOST = 0.28 // how much blob centers brighten toward white (domed look)
const DITHER = 6 // in-skin de-banding speckle span (never touches the background)
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

// hsl (h 0..360, s/l 0..1) → rgb 0..255
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  const c = (1 - Math.abs(2 * l - 1)) * s
  const hp = h / 60
  const x = c * (1 - Math.abs((hp % 2) - 1))
  let r = 0
  let g = 0
  let b = 0
  if (hp < 1) [r, g, b] = [c, x, 0]
  else if (hp < 2) [r, g, b] = [x, c, 0]
  else if (hp < 3) [r, g, b] = [0, c, x]
  else if (hp < 4) [r, g, b] = [0, x, c]
  else if (hp < 5) [r, g, b] = [x, 0, c]
  else [r, g, b] = [c, 0, x]
  const m = l - c / 2
  return [(r + m) * 255, (g + m) * 255, (b + m) * 255]
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
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
  squash: number // mild ellipse aspect for shape variety
  hueN: number // normalized hue position (-1..1)
  hueJit: number
  hueWobAmt: number
  hueWobFreq: number
  hueWobPhase: number
}

function makeBlobs(count: number): Blob[] {
  const rnd = (a: number, b: number) => a + Math.random() * (b - a)
  const blobs: Blob[] = []
  for (let i = 0; i < count; i++) {
    blobs.push({
      ax: rnd(0.12, 0.88),
      ay: rnd(0.1, 0.9),
      ampx: rnd(0.14, 0.34),
      ampy: rnd(0.16, 0.36),
      fx: rnd(0.00005, 0.00014),
      fy: rnd(0.00005, 0.00014),
      px: rnd(0, TWO_PI),
      py: rnd(0, TWO_PI),
      baseR: rnd(0.14, 0.24),
      pr: rnd(0.00007, 0.00018),
      pp: rnd(0, TWO_PI),
      squash: rnd(0.78, 1.0),
      hueN: (i / Math.max(1, count - 1)) * 2 - 1,
      hueJit: rnd(-12, 12),
      hueWobAmt: rnd(6, 16),
      hueWobFreq: rnd(0.00003, 0.00009),
      hueWobPhase: rnd(0, TWO_PI),
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

    // Tiny field canvas; CSS stretches it to fill (cheap GPU bilinear upscale)
    const aspect = size.width / size.height
    const w = aspect >= 1 ? RES_LONG : Math.max(1, Math.round(RES_LONG * aspect))
    const h = aspect >= 1 ? Math.max(1, Math.round(RES_LONG / aspect)) : RES_LONG
    canvas.width = w
    canvas.height = h
    const minDim = Math.min(w, h)
    const blobs = blobsRef.current
    const n = blobs.length

    const image = ctx.createImageData(w, h)
    const data = image.data

    // Static per-pixel speckle (applied only inside the skin) to break banding
    const noise = new Float32Array(w * h)
    for (let i = 0; i < noise.length; i++) noise[i] = (Math.random() - 0.5) * DITHER

    // Per-blob scratch buffers, refreshed each frame
    const bx = new Float64Array(n)
    const by = new Float64Array(n)
    const r2 = new Float64Array(n)
    const invSq = new Float64Array(n)
    const br = new Float64Array(n)
    const bgc = new Float64Array(n)
    const bb = new Float64Array(n)

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
      const [bgr, bgg, bgb] = hexToRgb(pal.bg)
      const sat = pal.sat / 100
      const baseLight = pal.light / 100

      for (let k = 0; k < n; k++) {
        const b = blobs[k]
        bx[k] = (b.ax + Math.sin(elapsed * b.fx * windFactor + b.px) * b.ampx) * w
        by[k] = (b.ay + Math.cos(elapsed * b.fy * windFactor + b.py) * b.ampy) * h
        const r = b.baseR * minDim * (1 + 0.16 * Math.sin(elapsed * b.pr + b.pp))
        r2[k] = r * r
        invSq[k] = 1 / b.squash
        const wob = Math.sin(elapsed * b.hueWobFreq + b.hueWobPhase) * b.hueWobAmt
        const hue = (((anchorHue + b.hueN * pal.spread + b.hueJit + wob) % 360) + 360) % 360
        const [r8, g8, b8] = hslToRgb(hue, sat, baseLight)
        br[k] = r8
        bgc[k] = g8
        bb[k] = b8
      }

      const skinRange = SKIN_HI - SKIN_LO
      const coreRange = SKIN_HI * 1.4
      let p = 0
      let pi = 0
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          let field = 0
          let ra = 0
          let ga = 0
          let ba = 0
          for (let k = 0; k < n; k++) {
            const dx = x - bx[k]
            const dy = (y - by[k]) * invSq[k]
            const wgt = r2[k] / (dx * dx + dy * dy + 1)
            field += wgt
            ra += wgt * br[k]
            ga += wgt * bgc[k]
            ba += wgt * bb[k]
          }

          // Wide, soft skin so the bilinear upscale stays smooth (no stairsteps)
          let a = (field - SKIN_LO) / skinRange
          if (a <= 0) {
            // Pure background — never dithered, so black stays pristine
            data[p++] = bgr
            data[p++] = bgg
            data[p++] = bgb
            data[p++] = 255
            pi++
            continue
          }
          if (a > 1) a = 1
          a = a * a * (3 - 2 * a)

          const inv = 1 / field
          let cr = ra * inv
          let cg = ga * inv
          let cb = ba * inv
          // Brighten toward the core for a domed, 3D lava look
          let core = (field - SKIN_HI) / coreRange
          if (core > 0) {
            if (core > 1) core = 1
            const boost = core * CORE_BOOST
            cr += (255 - cr) * boost
            cg += (255 - cg) * boost
            cb += (255 - cb) * boost
          }
          const nv = noise[pi++]
          data[p++] = bgr + (cr - bgr) * a + nv
          data[p++] = bgg + (cg - bgg) * a + nv
          data[p++] = bgb + (cb - bgb) * a + nv
          data[p++] = 255
        }
      }
      ctx.putImageData(image, 0, 0)
    }

    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [size])

  return (
    <div ref={containerRef} className="absolute inset-0 overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" style={{ imageRendering: 'auto' }} />
    </div>
  )
}
