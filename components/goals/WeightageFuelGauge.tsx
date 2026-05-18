'use client'

import { cn } from '@/lib/utils'

interface WeightageFuelGaugeProps {
  used: number
  max?: number
}

export function WeightageFuelGauge({ used, max = 100 }: WeightageFuelGaugeProps) {
  const percent = Math.min((used / max) * 100, 110)
  const remaining = max - used
  const isOver = used > max
  const isExact = used === max

  const fillColor = isOver ? '#f43f5e' : isExact ? '#10b981' : used >= 80 ? '#f59e0b' : '#3b82f6'
  const trackBg   = isOver ? 'rgba(244,63,94,0.08)' : isExact ? 'rgba(16,185,129,0.08)' : 'var(--muted)'
  const borderClr = isOver ? 'rgba(244,63,94,0.25)' : isExact ? 'rgba(16,185,129,0.25)' : 'var(--border)'

  return (
    <div
      className="rounded-2xl border p-5"
      style={{ background: trackBg, borderColor: borderClr }}
    >
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--muted-foreground)' }}>
          Weightage Budget
        </span>
        <span
          className="text-xl font-extrabold"
          style={{ color: fillColor, fontFamily: 'var(--font-syne)' }}
        >
          {used} / {max}
        </span>
      </div>

      <div
        className="relative h-3 w-full overflow-hidden rounded-full"
        style={{ background: 'var(--border)' }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: `linear-gradient(90deg, ${fillColor}99, ${fillColor})`,
            boxShadow: isExact ? `0 0 12px ${fillColor}80` : undefined,
          }}
        />
      </div>

      <p className="mt-3 text-xs font-bold" style={{ color: fillColor }}>
        {isOver
          ? `⚠ Over by ${-remaining}%. Reduce some goals.`
          : isExact
          ? '✓ All weight assigned. Ready to submit!'
          : `${remaining}% remaining to allocate.`}
      </p>
    </div>
  )
}
