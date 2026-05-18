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

  const fillColor = isOver
    ? '#f43f5e'
    : isExact
    ? '#10b981'
    : used >= 80
    ? '#f59e0b'
    : '#3b82f6'

  return (
    <div
      className={cn(
        'rounded-xl border p-4',
        isOver ? 'border-red-200 bg-red-50' :
        isExact ? 'border-green-200 bg-green-50' :
        'border-slate-200 bg-slate-50'
      )}
    >
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Weight used</span>
        <span className="text-sm font-bold" style={{ color: fillColor, fontFamily: 'var(--font-syne)' }}>
          {used}% / {max}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-[#22222e]">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${Math.min(percent, 100)}%`,
            background: `linear-gradient(90deg, ${fillColor}99, ${fillColor})`,
            boxShadow: isExact ? `0 0 10px ${fillColor}80` : undefined,
          }}
        />
      </div>

      <div className="mt-2 text-xs" style={{ color: fillColor }}>
        {isOver
          ? `Over by ${-remaining}%. Reduce some goals.`
          : isExact
          ? 'All weight assigned. Ready to submit.'
          : `${remaining}% remaining to assign.`}
      </div>
    </div>
  )
}
