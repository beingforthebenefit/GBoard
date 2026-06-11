import { Fragment, memo, useEffect, useRef, useState } from 'react'

export type BoardStatusKind = 'ok' | 'active' | 'dim'

export interface BoardRow {
  time: string
  title: string
  detail?: string
  status: string
  statusKind?: BoardStatusKind
}

interface SplitFlapBoardProps {
  rows: BoardRow[]
  titleWidth?: number
  /** Pad the board with blank flap rows up to this count so it fills its panel */
  minRows?: number
  /** Bump this number to make the whole board re-spin in a staggered cascade */
  sweepSeed?: number
  className?: string
}

const STATUS_COLORS: Record<BoardStatusKind, string> = {
  ok: '#e7b75f',
  active: '#4ade80',
  dim: 'rgba(231, 183, 95, 0.35)',
}

const SPIN_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
const SPIN_STEP_MS = 70
const SPIN_MIN_MS = 180
const SPIN_VAR_MS = 240

const SEGMENTER = typeof Intl.Segmenter === 'function' ? new Intl.Segmenter() : null

/**
 * Split text into split-flap cells: ASCII characters (accents folded, other
 * symbols dropped) plus whole emoji kept as single cells \u2014 real Solari boards
 * mixed printed symbol flaps (airline logos) in with the character flaps.
 */
export function flapCells(text: string): string[] {
  const graphemes = SEGMENTER
    ? Array.from(SEGMENTER.segment(text), (s) => s.segment)
    : Array.from(text)
  const cells: string[] = []
  for (const grapheme of graphemes) {
    if (/\p{Extended_Pictographic}/u.test(grapheme)) {
      cells.push(grapheme)
      continue
    }
    const folded = grapheme.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    for (const ch of folded) {
      if (ch < ' ' || ch > '~') continue
      if (ch === ' ' && cells[cells.length - 1] === ' ') continue
      cells.push(ch.toUpperCase())
    }
  }
  while (cells[0] === ' ') cells.shift()
  while (cells[cells.length - 1] === ' ') cells.pop()
  return cells
}

export function flapText(text: string): string {
  return flapCells(text).join('')
}

/** A single split-flap character cell. spinDelayMs marks it as a target for board sweeps. */
export function Flap({ char, spinDelayMs }: { char: string; spinDelayMs?: number }) {
  return (
    <span
      className="flap-tile inline-flex items-center justify-center w-[1.05em] h-[1.5em] mr-px rounded-[2px] font-mono uppercase"
      data-flap-char={spinDelayMs != null ? char : undefined}
      data-flap-delay={spinDelayMs != null ? spinDelayMs : undefined}
      style={{
        background: 'linear-gradient(180deg, #232325 0%, #232325 49%, #1a1a1c 51%, #1a1a1c 100%)',
        boxShadow: 'inset 0 -1px 0 rgba(0, 0, 0, 0.6)',
      }}
    >
      {char}
    </span>
  )
}

/**
 * A self-spinning flap cell with its own timer. Only use for a handful of tiles
 * (e.g. the clock); board tiles are driven by the shared sweep timer instead.
 */
export function FlapChar({ char, delayMs = 0 }: { char: string; delayMs?: number }) {
  const [display, setDisplay] = useState(char)
  const [tick, setTick] = useState(0)

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined
    let steps = 0
    const totalSteps = 3 + Math.floor(Math.random() * 4)
    const timeout = setTimeout(() => {
      interval = setInterval(() => {
        steps++
        if (steps >= totalSteps) {
          setDisplay(char)
          if (interval) clearInterval(interval)
        } else {
          setDisplay(SPIN_CHARS[Math.floor(Math.random() * SPIN_CHARS.length)])
        }
        setTick((t) => t + 1)
      }, SPIN_STEP_MS)
    }, delayMs)
    return () => {
      clearTimeout(timeout)
      if (interval) clearInterval(interval)
    }
  }, [char, delayMs])

  return <Flap key={tick} char={display} />
}

function FlapWord({
  text,
  width,
  baseDelayMs = 0,
}: {
  text: string
  width: number
  baseDelayMs?: number
}) {
  const cells = flapCells(text).slice(0, width)
  while (cells.length < width) cells.push(' ')
  return (
    <span className="whitespace-nowrap">
      {cells.map((char, i) => (
        <Flap key={i} char={char} spinDelayMs={baseDelayMs + i * 25} />
      ))}
    </span>
  )
}

const BLANK_ROW: BoardRow = { time: '', title: '', status: '' }

/** Solari-style departures board: each row is a flight */
export const SplitFlapBoard = memo(function SplitFlapBoard({
  rows,
  titleWidth = 22,
  minRows = 0,
  sweepSeed = 0,
  className = '',
}: SplitFlapBoardProps) {
  const boardRef = useRef<HTMLDivElement>(null)
  const padded =
    rows.length < minRows
      ? [...rows, ...Array.from({ length: minRows - rows.length }, () => BLANK_ROW)]
      : rows
  // Re-sweep when visible content changes, not when row array identity changes
  const rowsKey = padded.map((r) => `${r.time}|${r.title}|${r.status}`).join('~')

  // One shared timer drives every tile imperatively (textContent + a looping CSS
  // class). Per-tile timers and React re-renders overwhelm low-power devices.
  useEffect(() => {
    const board = boardRef.current
    if (!board) return

    const tiles = Array.from(board.querySelectorAll<HTMLElement>('[data-flap-char]'))
      .map((el) => ({
        el,
        target: el.dataset.flapChar ?? ' ',
        start: Number(el.dataset.flapDelay ?? 0),
        end: Number(el.dataset.flapDelay ?? 0) + SPIN_MIN_MS + Math.random() * SPIN_VAR_MS,
        done: false,
      }))
      // Blank flaps stay blank — skipping them cuts the animated tile count hugely
      .filter((t) => t.target !== ' ')
    if (tiles.length === 0) return

    let elapsed = 0
    const id = setInterval(() => {
      elapsed += SPIN_STEP_MS
      let pending = false
      for (const t of tiles) {
        if (t.done) continue
        pending = true
        if (elapsed < t.start) continue
        if (elapsed < t.end) {
          t.el.classList.add('flap-spinning')
          t.el.textContent = SPIN_CHARS[(Math.random() * SPIN_CHARS.length) | 0]
        } else {
          t.el.textContent = t.target
          t.el.classList.remove('flap-spinning')
          t.done = true
        }
      }
      if (!pending) clearInterval(id)
    }, SPIN_STEP_MS)

    return () => {
      clearInterval(id)
      for (const t of tiles) {
        t.el.textContent = t.target
        t.el.classList.remove('flap-spinning')
      }
    }
  }, [sweepSeed, rowsKey])

  return (
    // One grid for the header and every row, so the column tracks stay aligned
    <div
      ref={boardRef}
      className={`grid items-center gap-x-4 gap-y-2.5 content-start font-mono text-amber-100 ${className}`}
      style={{ gridTemplateColumns: 'auto 1fr auto' }}
    >
      <Fragment>
        {['Time', 'Destination', 'Status'].map((label) => (
          <span
            key={label}
            className={`text-[10px] tracking-[0.25em] uppercase ${
              label === 'Status' ? 'text-right' : ''
            }`}
            style={{ color: 'rgba(231, 183, 95, 0.5)' }}
          >
            {label}
          </span>
        ))}
        <div className="border-b border-amber-200/20 -mt-1" style={{ gridColumn: '1 / -1' }} />
      </Fragment>
      {padded.map((row, i) => (
        <Fragment key={`${row.title}-${row.status}-${i}`}>
          <span className="text-base tabular-nums" style={{ color: '#e7b75f' }}>
            <FlapWord text={row.time} width={7} baseDelayMs={i * 110} />
          </span>
          <span className="min-w-0 flex items-baseline gap-2 text-base">
            <FlapWord text={row.title} width={titleWidth} baseDelayMs={i * 110 + 7 * 25} />
            {row.detail && (
              <span
                className="text-xs truncate normal-case"
                style={{ color: 'rgba(231, 183, 95, 0.45)' }}
              >
                {row.detail}
              </span>
            )}
          </span>
          <span
            className={`text-xs tracking-[0.15em] uppercase text-right ${
              row.statusKind === 'active' ? 'pulse-dot' : ''
            }`}
            style={{ color: STATUS_COLORS[row.statusKind ?? 'ok'] }}
          >
            {row.status}
          </span>
        </Fragment>
      ))}
      {padded.length === 0 && (
        <div
          className="text-xs py-3"
          style={{ gridColumn: '1 / -1', color: 'rgba(231, 183, 95, 0.4)' }}
        >
          NO SCHEDULED DEPARTURES
        </div>
      )}
    </div>
  )
})
