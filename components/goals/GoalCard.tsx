'use client'

import { Goal, SheetStatus } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from './ScoreRing'
import { Button } from '@/components/ui/button'
import { Trash2, Lock } from 'lucide-react'

const STATUS_STYLES: Record<SheetStatus, { label: string; color: string }> = {
  draft: { label: 'Draft', color: '#94a3b8' },
  submitted: { label: 'Submitted', color: '#3b82f6' },
  approved: { label: 'Approved', color: '#22c55e' },
  returned: { label: 'Returned', color: '#ef4444' },
}

interface GoalCardProps {
  goal: Goal
  sheetStatus: SheetStatus
  avgScore?: number
  onDelete?: (id: string) => void
  onClick?: () => void
}

export function GoalCard({ goal, sheetStatus, avgScore = 0, onDelete, onClick }: GoalCardProps) {
  const status = STATUS_STYLES[sheetStatus]
  const isLocked = sheetStatus === 'approved'

  return (
    <Card
      className="relative cursor-pointer transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${status.color}` }}
      onClick={onClick}
    >
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-1.5">
              {goal.thrust_area && (
                <span
                  className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                  style={{ background: goal.thrust_area.color }}
                >
                  {goal.thrust_area.name}
                </span>
              )}
              <Badge
                variant="outline"
                className="text-xs"
                style={{ borderColor: status.color, color: status.color }}
              >
                {status.label}
              </Badge>
              {isLocked && <Lock className="h-3 w-3 text-slate-400" />}
              {goal.is_shared && (
                <Badge variant="outline" className="text-xs text-purple-600 border-purple-300">
                  Shared
                </Badge>
              )}
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{goal.title}</h3>
            {goal.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{goal.description}</p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-slate-500">
              <span className="font-medium text-slate-700">{goal.weightage}% weight</span>
              <span>•</span>
              <span>{goal.uom_type.replace('_', ' ')}</span>
              {goal.target_value !== null && (
                <>
                  <span>•</span>
                  <span>Target: {goal.target_value}</span>
                </>
              )}
              {goal.target_date && (
                <>
                  <span>•</span>
                  <span>By {goal.target_date}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={avgScore} size={48} />
            {!isLocked && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(goal.id)
                }}
                className="rounded p-1 text-slate-400 hover:bg-red-50 hover:text-red-500"
                title="Remove goal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
