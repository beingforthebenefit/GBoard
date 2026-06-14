import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface OrigamiFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables ──
// A folded-paper tessellation. The sheet corrugates in BOTH directions at once (an
// egg-carton / Miura diamond grid): every vertex is a peak or a pit, so each quad
// facet tilts in 2D and catches the light differently — no flat "bands." It animates
// by actually folding: as the fold angle breathes, the diamonds deepen and the whole
// grid compresses toward the center (pleats bunching up), then spreads flat as it
// opens. A slow traveling wave makes regions fold at different times. Flat-shaded
// polygons keep it cheap on the Pi (no per-pixel work, no filters).
const TARGET_FPS = 30
const MAX_DPR = 1.5
const VIS_COLS = 5 // diamonds across the screen when open (fewer = bolder folds)
const VIS_ROWS = 9
const COLS = 12 // total columns — oversized so the compressed grid still covers
const ROWS = 20 // total rows
const MAX_ANGLE = 1.05 // peak fold angle in radians (~60°)
const FOLD_MIN = 0.12 // residual fold when "open" — avoids a dead-flat sheet
const FOLD_MAX = 0.95 // peak fold at the top of the breath
const DEPTH = 1.15 // crease depth, as a multiple of cell size × sin(fold)
const FOCAL = 1050 // perspective focal length in px (smaller = stronger parallax)
const BREATHE_SPEED = 0.00032 // global fold/unfold rate (rad/ms) ≈ 20s per breath
const WAVE_AMP = 0.18 // per-region fold variation (fold units) — traveling fold
const WAVE_SPEED = 0.0013 // travel speed of that wave (rad/ms)
const WAVE_X = 0.7 // wave spatial frequency across columns
const WAVE_Y = 0.45 // …and down rows (combined → diagonal travel)
const HUE_SPREAD = 30 // hue gradient across the sheet
const HUE_DRIFT = 0.0015 // paper hue drift (deg/ms)

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** Paper hue from temperature: cool teal-blue paper when cold, warm coral when hot */
export function tempToPaperHue(tempF: number): number {
  const stops: [number, number][] = [
    [30, 210],
    [55, 160],
    [75, 40],
    [92, -10],
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
  sat: number
  baseLight: number // facet lightness facing the light squarely
  contrast: number // lightness swing from shadow to highlight
}

export function origamiPalette(dark: boolean): Palette {
  if (dark) return { sat: 48, baseLight: 38, contrast: 40 }
  return { sat: 40, baseLight: 70, contrast: 34 }
}

// Light direction (from upper-left, toward the viewer), normalized
const LX = -0.4
const LY = -0.6
const LZ = 0.7
const LLEN = Math.sqrt(LX * LX + LY * LY + LZ * LZ)

export function OrigamiField({ weather, dark }: OrigamiFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const size = useElementSize(containerRef)

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

    const cssW = size.width / (window.devicePixelRatio || 1)
    const cssH = size.height / (window.devicePixelRatio || 1)
    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR)
    canvas.width = Math.round(cssW * dpr)
    canvas.height = Math.round(cssH * dpr)
    ctx.scale(dpr, dpr)

    const cx = cssW / 2
    const cy = cssH / 2
    const cellW = cssW / VIS_COLS // diamond size when open (oversized grid covers edges)
    const cellH = cssH / VIS_ROWS
    const cellMin = Math.min(cellW, cellH)

    const NV = COLS + 1 // vertices per row
    const NR = ROWS + 1 // vertex rows
    const N = NV * NR
    const WX = new Float64Array(N) // world x (compressed)
    const WY = new Float64Array(N) // world y (compressed)
    const WZ = new Float64Array(N) // world z (depth; + toward viewer)
    const SX = new Float64Array(N) // projected screen x
    const SY = new Float64Array(N) // projected screen y

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
      const pal = origamiPalette(darkRef.current)
      const baseHue = tempToPaperHue(wx?.temp ?? 60) + elapsed * HUE_DRIFT

      // Global fold breath (eases between FOLD_MIN and FOLD_MAX) + a traveling wave
      const breathe = 0.5 - 0.5 * Math.cos(elapsed * BREATHE_SPEED)
      const foldGlobal = FOLD_MIN + (FOLD_MAX - FOLD_MIN) * breathe
      const wt = elapsed * WAVE_SPEED

      // Build the folded grid: corrugate in both directions, compress as it folds
      for (let i = 0; i <= COLS; i++) {
        const iSign = i & 1 ? -1 : 1 // column parity → half of the egg-carton
        const baseX = (i - COLS / 2) * cellW
        for (let j = 0; j <= ROWS; j++) {
          const f = clamp(foldGlobal + WAVE_AMP * Math.sin(i * WAVE_X + j * WAVE_Y - wt), 0, 1)
          const a = f * MAX_ANGLE
          const comp = Math.cos(a) // in-plane compression: pleats bunch as they fold
          const amp = DEPTH * cellMin * Math.sin(a)
          const jSign = j & 1 ? -1 : 1
          const worldX = baseX * comp
          const worldY = (j - ROWS / 2) * cellH * comp
          const z = 0.5 * amp * (iSign + jSign) // egg-carton: peaks, pits, saddles
          const idx = i * NR + j
          WX[idx] = worldX
          WY[idx] = worldY
          WZ[idx] = z
          const s = FOCAL / (FOCAL - z)
          SX[idx] = cx + worldX * s
          SY[idx] = cy + worldY * s
        }
      }

      // Shade and fill each quad facet
      for (let i = 0; i < COLS; i++) {
        const hue = (((baseHue + (i / COLS) * HUE_SPREAD) % 360) + 360) % 360
        for (let j = 0; j < ROWS; j++) {
          const i00 = i * NR + j
          const i10 = (i + 1) * NR + j
          const i01 = i * NR + (j + 1)
          const i11 = (i + 1) * NR + (j + 1)

          // Quad normal from its diagonals: d1 = P11 − P00, d2 = P01 − P10
          const d1x = WX[i11] - WX[i00]
          const d1y = WY[i11] - WY[i00]
          const d1z = WZ[i11] - WZ[i00]
          const d2x = WX[i01] - WX[i10]
          const d2y = WY[i01] - WY[i10]
          const d2z = WZ[i01] - WZ[i10]
          let nx = d1y * d2z - d1z * d2y
          let ny = d1z * d2x - d1x * d2z
          let nz = d1x * d2y - d1y * d2x
          if (nz < 0) {
            nx = -nx
            ny = -ny
            nz = -nz
          }
          const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
          const ndotl = (nx * LX + ny * LY + nz * LZ) / (nlen * LLEN)
          const light = clamp(pal.baseLight + ndotl * pal.contrast, 5, 97)

          ctx.fillStyle = `hsl(${hue}, ${pal.sat}%, ${light}%)`
          ctx.strokeStyle = ctx.fillStyle // seal hairline seams between facets
          ctx.beginPath()
          ctx.moveTo(SX[i00], SY[i00])
          ctx.lineTo(SX[i10], SY[i10])
          ctx.lineTo(SX[i11], SY[i11])
          ctx.lineTo(SX[i01], SY[i01])
          ctx.closePath()
          ctx.fill()
          ctx.stroke()
        }
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
