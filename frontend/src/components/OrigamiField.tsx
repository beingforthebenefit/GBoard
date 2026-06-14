import { useEffect, useRef } from 'react'
import { WeatherData } from '../types/index.js'
import { useElementSize } from '../hooks/useElementSize.js'

interface OrigamiFieldProps {
  weather: WeatherData | null
  dark: boolean
}

// ── Tunables ──
// Flat-shaded polygons are cheap on the Pi (no per-pixel work, no filters). A grid
// of paper facets folds as a wave travels across it: creases lift and each facet's
// light/shadow shifts with its tilt, so it reads as paper folding and unfolding.
const COLS = 11
const ROWS = 20
const TARGET_FPS = 30
const MAX_DPR = 1.5
const DEPTH = 0.62 // crease height as a fraction of a cell (fold relief)
const ZIG = 0.16 // per-column row shift (parallelogram zigzag)
const SX = 0.9 // fold-wave spatial frequency along columns (rad/cell)
const SY = 0.5 // …and along rows
const SPEED = 0.0012 // fold-wave travel speed (rad/ms)
const HUE_SPREAD = 42 // hue gradient across the sheet
const HUE_DRIFT = 0.0018 // paper hue drift (deg/ms)

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
  if (dark) return { sat: 46, baseLight: 40, contrast: 30 }
  return { sat: 38, baseLight: 70, contrast: 26 }
}

// Light direction (from upper-left, slightly toward the viewer), normalized
const LX = -0.45
const LY = -0.55
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

    const cellW = cssW / COLS
    const cellH = cssH / ROWS
    const depthPx = cellH * DEPTH
    const zigPx = cellH * ZIG

    // Overscan one cell so fold relief never opens gaps at the screen edges
    const i0 = -1
    const i1 = COLS + 1
    const j0 = -1
    const j1 = ROWS + 1
    const cols = i1 - i0 + 1
    const rows = j1 - j0 + 1
    // Scratch grids (reused each frame)
    const px = new Float64Array(cols * rows) // projected x
    const py = new Float64Array(cols * rows) // projected y
    const wy = new Float64Array(cols * rows) // world y (for normals)
    const wz = new Float64Array(cols * rows) // world z (for normals)

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
      const t = elapsed * SPEED

      // Build the folded grid
      for (let a = 0; a < cols; a++) {
        const i = i0 + a
        const colSign = i & 1 ? 1 : -1
        const xBase = i * cellW
        for (let b = 0; b < rows; b++) {
          const j = j0 + b
          const fold = 0.5 + 0.5 * Math.sin(i * SX + j * SY - t) // 0..1 traveling fold
          const z = colSign * depthPx * fold
          const worldY = j * cellH + colSign * zigPx * fold
          const idx = a * rows + b
          wy[idx] = worldY
          wz[idx] = z
          px[idx] = xBase
          py[idx] = worldY - z // oblique projection: ridges lift upward
        }
      }

      // Shade and fill each quad facet
      for (let a = 0; a < cols - 1; a++) {
        const i = i0 + a
        const hue = (((baseHue + (i / COLS) * HUE_SPREAD) % 360) + 360) % 360
        for (let b = 0; b < rows - 1; b++) {
          const i00 = a * rows + b
          const i10 = (a + 1) * rows + b
          const i01 = a * rows + (b + 1)
          const i11 = (a + 1) * rows + (b + 1)

          // Facet normal from world-space edges (x is uniform: cellW per column)
          const e1y = wy[i10] - wy[i00]
          const e1z = wz[i10] - wz[i00]
          const e2y = wy[i01] - wy[i00]
          const e2z = wz[i01] - wz[i00]
          // n = e1 × e2, with e1=(cellW,e1y,e1z), e2=(0,e2y,e2z)
          let nx = e1y * e2z - e1z * e2y
          let ny = e1z * 0 - cellW * e2z
          let nz = cellW * e2y - e1y * 0
          if (nz < 0) {
            nx = -nx
            ny = -ny
            nz = -nz
          }
          const nlen = Math.sqrt(nx * nx + ny * ny + nz * nz) || 1
          const ndotl = (nx * LX + ny * LY + nz * LZ) / (nlen * LLEN)
          const light = clamp(pal.baseLight + ndotl * pal.contrast, 6, 96)

          ctx.fillStyle = `hsl(${hue}, ${pal.sat}%, ${light}%)`
          ctx.strokeStyle = ctx.fillStyle // seal hairline seams between facets
          ctx.beginPath()
          ctx.moveTo(px[i00], py[i00])
          ctx.lineTo(px[i10], py[i10])
          ctx.lineTo(px[i11], py[i11])
          ctx.lineTo(px[i01], py[i01])
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
