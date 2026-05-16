'use client'

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
    ? '#ef4444'
    : isExact
    ? '#22c55e'
    : used >= 80
    ? '#f97316'
    : '#3b82f6'

  const bgColor = isOver
    ? '#fef2f2'
    : isExact
    ? '#f0fdf4'
    : '#f1f5f9'

  return (
    <div className="rounded-xl border p-4" style={{ background: bgColor, borderColor: fillColor + '40' }}>
      <div className="mb-2 flex items-center justify-between">
        <span className="text-sm font-medium text-slate-700">Weightage used</span>
        <span className="text-sm font-semibold" style={{ color: fillColor }}>
          {used}% / {max}%
        </span>
      </div>

      <div className="relative h-3 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-all duration-300"
          style={{ width: `${Math.min(percent, 100)}%`, background: fillColor }}
        />
      </div>

      <div className="mt-2 text-xs" style={{ color: fillColor }}>
        {isOver
          ? `Over by ${-remaining}%. Reduce some goals.`
          : isExact
          ? 'All weightage assigned. Ready to submit.'
          : `${remaining}% remaining to assign.`}
      </div>
    </div>
  )
}
