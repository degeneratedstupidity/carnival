'use client'

import { useId } from 'react'
import { getScoreColor } from '@/lib/scoring'

interface ScoreRingProps {
  score: number
  size?: number
  strokeWidth?: number
  showLabel?: boolean
}

export function ScoreRing({ score, size = 56, strokeWidth = 5, showLabel = true }: ScoreRingProps) {
  const id = useId()
  const gradientId = `score-grad-${id.replace(/:/g, '')}`

  const radius = (size - strokeWidth * 2) / 2
  const circumference = 2 * Math.PI * radius
  const filled = Math.min(score, 100)
  const offset = circumference - (filled / 100) * circumference
  const color = score === 0 ? 'var(--ring-track)' : getScoreColor(score)
  const isMaxed = score >= 100

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        style={isMaxed ? { filter: `drop-shadow(0 0 6px ${color})` } : undefined}
      >
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={color} stopOpacity="0.6" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--ring-track)"
          strokeWidth={strokeWidth}
        />
        {/* Arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={score === 0 ? 'transparent' : `url(#${gradientId})`}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.5s ease' }}
        />
      </svg>
      {showLabel && (
        <span
          className="absolute text-xs font-bold"
          style={{ color, fontFamily: 'var(--font-syne)' }}
        >
          {score === 0 ? '—' : `${Math.round(score)}%`}
        </span>
      )}
    </div>
  )
}
