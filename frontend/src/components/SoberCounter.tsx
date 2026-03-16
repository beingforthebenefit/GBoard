import { useSoberCounter } from '../hooks/useSoberCounter.js'

interface SoberCounterProps {
  sobrietyDate: string
  className?: string
}

export function SoberCounter({ sobrietyDate, className = '' }: SoberCounterProps) {
  const { years, months, days, hours } = useSoberCounter(sobrietyDate)

  const cells = [
    { value: years, label: 'yr' },
    { value: months, label: 'mo' },
    { value: days, label: 'dy' },
    { value: hours, label: 'hr' },
  ]

  return (
    <div className={`card rounded-xl px-4 py-3 flex items-center gap-3 ${className}`}>
      <div
        className="text-[11px] font-medium uppercase tracking-widest flex-shrink-0"
        style={{ color: 'var(--text-3)' }}
      >
        Sober
      </div>
      <div className="flex gap-3 ml-auto">
        {cells.map(({ value, label }) => (
          <div key={label} className="text-center">
            <div
              className="text-xl font-light tabular-nums leading-none"
              style={{ color: 'var(--sober-text)' }}
            >
              {value}
            </div>
            <div
              className="text-[9px] uppercase tracking-wider mt-0.5"
              style={{ color: 'var(--text-3)' }}
            >
              {label}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
