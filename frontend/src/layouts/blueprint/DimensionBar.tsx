/** Progress drawn as a drafting dimension line */
export function DimensionBar({ pct, width = 72 }: { pct: number; width?: number }) {
  const W = width
  const x = Math.max(2, Math.min(W - 2, (Math.max(0, Math.min(100, pct)) / 100) * W))
  return (
    <svg width={W} height={10} className="inline-block align-middle mx-1" aria-hidden>
      <line x1="0" y1="5" x2={W} y2="5" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1="0.5" y1="1" x2="0.5" y2="9" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1={W - 0.5} y1="1" x2={W - 0.5} y2="9" stroke="var(--bp-line)" strokeWidth="1" />
      <line x1="0" y1="5" x2={x} y2="5" stroke="var(--bp-red)" strokeWidth="2" />
      <line x1={x} y1="1" x2={x} y2="9" stroke="var(--bp-red)" strokeWidth="1.5" />
    </svg>
  )
}
