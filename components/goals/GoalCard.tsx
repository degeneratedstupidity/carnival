'use client'

import { useState } from 'react'
import { Goal, SheetStatus } from '@/types'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { ScoreRing } from './ScoreRing'
import { Button } from '@/components/ui/button'
import { Trash2, Lock, Check } from 'lucide-react'

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
  onWeightageChange?: (id: string, newWeight: number) => void
  onClick?: () => void
}

export function GoalCard({ goal, sheetStatus, avgScore = 0, onDelete, onWeightageChange, onClick }: GoalCardProps) {
  const status = STATUS_STYLES[sheetStatus]
  const isLocked = sheetStatus === 'approved'
  const isSubmitted = sheetStatus === 'submitted'
  const canEditWeight = goal.is_shared && !isLocked && !isSubmitted && !!onWeightageChange
  const [editingWeight, setEditingWeight] = useState(false)
  const [weightInput, setWeightInput] = useState(String(goal.weightage))

  function saveWeight() {
    const val = parseInt(weightInput)
    if (!isNaN(val) && val >= 10 && val <= 100) {
      onWeightageChange?.(goal.id, val)
    } else {
      setWeightInput(String(goal.weightage))
    }
    setEditingWeight(false)
  }

  return (
    <Card
      className="relative transition-shadow hover:shadow-md"
      style={{ borderLeft: `3px solid ${status.color}` }}
      onClick={!editingWeight ? onClick : undefined}
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
                  Shared goal
                </Badge>
              )}
            </div>

            <h3 className="line-clamp-2 text-sm font-semibold text-slate-900">{goal.title}</h3>
            {goal.description && (
              <p className="mt-0.5 line-clamp-1 text-xs text-slate-500">{goal.description}</p>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-slate-500">
              {canEditWeight ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {editingWeight ? (
                    <>
                      <Input
                        type="number"
                        min={10}
                        max={100}
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        className="h-6 w-16 text-xs px-1"
                        autoFocus
                        onKeyDown={e => { if (e.key === 'Enter') saveWeight(); if (e.key === 'Escape') { setWeightInput(String(goal.weightage)); setEditingWeight(false) } }}
                      />
                      <button onClick={saveWeight} className="rounded p-0.5 text-green-600 hover:bg-green-50">
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingWeight(true)}
                      className="rounded border border-dashed border-slate-300 px-2 py-0.5 text-xs text-slate-600 hover:border-orange-400 hover:text-orange-600"
                      title="Click to edit weightage"
                    >
                      {goal.weightage}% weight (click to edit)
                    </button>
                  )}
                </div>
              ) : (
                <span className="font-medium text-slate-700">{goal.weightage}% weight</span>
              )}
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
            {!isLocked && !goal.is_shared && onDelete && (
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
