'use client'

import { useState } from 'react'
import { Goal, SheetStatus, UoMType } from '@/types'
import { uomLabel } from '@/lib/scoring'
import { ScoreRing } from './ScoreRing'
import { Input } from '@/components/ui/input'
import { Trash2, Lock, Check, Share2 } from 'lucide-react'

const STATUS_STYLES: Record<SheetStatus, { color: string; label: string }> = {
  draft:     { color: '#8888a3', label: 'Draft' },
  submitted: { color: '#3b82f6', label: 'Submitted' },
  approved:  { color: '#10b981', label: 'Approved' },
  returned:  { color: '#f43f5e', label: 'Returned' },
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
    <div
      className="group relative cursor-pointer overflow-hidden rounded-2xl border transition-all"
      style={{
        background: 'var(--card)',
        borderColor: 'var(--border)',
        borderLeft: `3px solid ${status.color}`,
      }}
      onClick={!editingWeight ? onClick : undefined}
    >
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            {/* Tags row */}
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              {goal.thrust_area && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                  style={{ background: goal.thrust_area.color }}
                >
                  {goal.thrust_area.name}
                </span>
              )}
              <span
                className="rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                style={{ background: status.color + '18', color: status.color }}
              >
                {status.label}
              </span>
              {isLocked && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: 'rgba(16,185,129,0.1)', color: '#10b981' }}
                >
                  <Lock className="h-2.5 w-2.5" /> Locked
                </span>
              )}
              {goal.is_shared && (
                <span
                  className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                  style={{ background: 'rgba(124,58,237,0.1)', color: '#a78bfa' }}
                >
                  <Share2 className="h-2.5 w-2.5" /> Shared
                </span>
              )}
            </div>

            {/* Title */}
            <h3
              className="line-clamp-2 text-base font-black uppercase leading-tight tracking-tight"
              style={{ color: 'var(--foreground)', fontFamily: 'var(--font-syne)' }}
            >
              {goal.title}
            </h3>
            {goal.description && (
              <p className="mt-0.5 line-clamp-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                {goal.description}
              </p>
            )}

            {/* Meta row */}
            <div className="mt-3 flex flex-wrap items-center gap-3 text-xs" style={{ color: 'var(--muted-foreground)' }}>
              {/* Weightage */}
              {canEditWeight ? (
                <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                  {editingWeight ? (
                    <>
                      <Input
                        type="number" min={10} max={100}
                        value={weightInput}
                        onChange={e => setWeightInput(e.target.value)}
                        className="h-6 w-16 px-1 text-xs"
                        autoFocus
                        onKeyDown={e => {
                          if (e.key === 'Enter') saveWeight()
                          if (e.key === 'Escape') { setWeightInput(String(goal.weightage)); setEditingWeight(false) }
                        }}
                      />
                      <button onClick={saveWeight} className="rounded-lg p-0.5" style={{ color: '#10b981' }}>
                        <Check className="h-3.5 w-3.5" />
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => setEditingWeight(true)}
                      className="rounded-lg border border-dashed px-2 py-0.5 text-xs transition-colors"
                      style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}
                    >
                      {goal.weightage}% (edit)
                    </button>
                  )}
                </div>
              ) : (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-black"
                  style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                >
                  {goal.weightage}%
                </span>
              )}
              <span style={{ color: 'var(--border)' }}>•</span>
              <span>{uomLabel(goal.uom_type as UoMType)}</span>
              {goal.target_value !== null && (
                <>
                  <span style={{ color: 'var(--border)' }}>•</span>
                  <span>Target: {goal.target_value}</span>
                </>
              )}
              {goal.target_date && (
                <>
                  <span style={{ color: 'var(--border)' }}>•</span>
                  <span>By {goal.target_date}</span>
                </>
              )}
            </div>
          </div>

          {/* Score + Delete */}
          <div className="flex flex-col items-center gap-2">
            <ScoreRing score={avgScore} size={48} />
            {!isLocked && !goal.is_shared && onDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); onDelete(goal.id) }}
                className="rounded-lg p-1 transition-colors"
                style={{ color: 'var(--muted-foreground)' }}
                onMouseEnter={(e) => { e.currentTarget.style.color = '#f43f5e'; e.currentTarget.style.background = 'rgba(244,63,94,0.08)' }}
                onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--muted-foreground)'; e.currentTarget.style.background = '' }}
                title="Remove goal"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
