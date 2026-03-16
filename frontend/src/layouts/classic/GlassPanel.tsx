interface GlassPanelProps {
  children: React.ReactNode
  className?: string
}

export function GlassPanel({ children, className = '' }: GlassPanelProps) {
  return (
    <div className={`bg-black/60 border border-white/24 rounded-2xl shadow-xl ${className}`}>
      {children}
    </div>
  )
}
