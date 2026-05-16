'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { ScoreRing } from '@/components/goals/ScoreRing'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { computeScore } from '@/lib/scoring'
import { Goal, CheckIn, GoalCycle, Profile, ProgressStatus, UoMType } from '@/types'

interface CheckinClientProps {
  profile: Profile
  activeCycle: GoalCycle
  goals: Goal[]
  initialCheckIns: CheckIn[]
  currentQuarter: string
}

export function CheckinClient({ profile, activeCycle, goals, initialCheckIns, currentQuarter }: CheckinClientProps) {
  const supabase = createClient()
  const [checkIns, setCheckIns] = useState<Record<string, Partial<CheckIn>>>(
    Object.fromEntries(initialCheckIns.map(ci => [ci.goal_id, ci]))
  )
  const [saving, setSaving] = useState<Record<string, boolean>>({})

  function getCheckin(goalId: string): Partial<CheckIn> {
    return checkIns[goalId] ?? { progress_status: 'not_started' }
  }

  function updateLocal(goalId: string, patch: Partial<CheckIn>) {
    setCheckIns(prev => {
      const current = prev[goalId] ?? {}
      const updated = { ...current, ...patch }
      // Recompute score
      const goal = goals.find(g => g.id === goalId)
      if (goal) {
        updated.computed_score = computeScore(
          goal.uom_type as UoMType,
          goal.target_value,
          updated.actual_value ?? null,
          goal.target_date,
          updated.actual_date ?? null,
        )
      }
      return { ...prev, [goalId]: updated }
    })
  }

  async function saveCheckin(goal: Goal) {
    const ci = checkIns[goal.id] ?? {}
    setSaving(prev => ({ ...prev, [goal.id]: true }))

    const score = computeScore(
      goal.uom_type as UoMType,
      goal.target_value,
      ci.actual_value ?? null,
      goal.target_date,
      ci.actual_date ?? null,
    )

    const payload = {
      goal_id: goal.id,
      cycle_id: activeCycle.id,
      quarter: currentQuarter,
      actual_value: ci.actual_value ?? null,
      actual_date: ci.actual_date ?? null,
      progress_status: ci.progress_status ?? 'not_started',
      computed_score: score,
      updated_at: new Date().toISOString(),
    }

    const { error } = await supabase
      .from('check_ins')
      .upsert(payload, { onConflict: 'goal_id,quarter' })

    if (error) {
      toast.error('Could not save check-in')
    } else {
      toast.success('Check-in saved')
    }
    setSaving(prev => ({ ...prev, [goal.id]: false }))
  }

  const quarterLabel = currentQuarter.toUpperCase()

  return (
    <AppShell role="employee" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">{quarterLabel} Check-in</h1>
          <p className="text-sm text-slate-500">{activeCycle.name} — Log your actual achievement</p>
        </div>

        <div className="space-y-4">
          {goals.map(goal => {
            const ci = getCheckin(goal.id)
            const score = ci.computed_score ?? 0
            const needsDate = goal.uom_type === 'timeline'
            const needsValue = ['min_numeric', 'max_numeric', 'min_percent', 'max_percent'].includes(goal.uom_type)
            const isZero = goal.uom_type === 'zero'

            return (
              <div key={goal.id} className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      {goal.thrust_area && (
                        <span
                          className="rounded px-1.5 py-0.5 text-xs font-medium text-white"
                          style={{ background: goal.thrust_area.color }}
                        >
                          {goal.thrust_area.name}
                        </span>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {goal.weightage}% weight
                      </Badge>
                    </div>
                    <h3 className="text-sm font-semibold text-slate-900">{goal.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-500">
                      Target:{' '}
                      {goal.uom_type === 'timeline'
                        ? goal.target_date
                        : goal.uom_type === 'zero'
                        ? '0 (zero incidents)'
                        : `${goal.target_value}${goal.uom_type.includes('percent') ? '%' : ''}`}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {needsValue && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Actual value</label>
                          <Input
                            type="number"
                            value={ci.actual_value ?? ''}
                            onChange={(e) => updateLocal(goal.id, { actual_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder={`e.g. ${goal.target_value}`}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {needsDate && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Completion date</label>
                          <Input
                            type="date"
                            value={ci.actual_date ?? ''}
                            onChange={(e) => updateLocal(goal.id, { actual_date: e.target.value })}
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {isZero && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Actual count</label>
                          <Input
                            type="number"
                            min={0}
                            value={ci.actual_value ?? ''}
                            onChange={(e) => updateLocal(goal.id, { actual_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="0"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      <div className="space-y-1">
                        <label className="text-xs font-medium text-slate-600">Status</label>
                        <Select
                          value={ci.progress_status ?? 'not_started'}
                          onValueChange={(v) => { if (v) updateLocal(goal.id, { progress_status: v as ProgressStatus }) }}
                        >
                          <SelectTrigger className="h-8 text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="not_started">Not started</SelectItem>
                            <SelectItem value="on_track">On track</SelectItem>
                            <SelectItem value="completed">Completed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-center gap-3">
                    <ScoreRing score={score} size={60} />
                    <Button
                      size="sm"
                      onClick={() => saveCheckin(goal)}
                      disabled={saving[goal.id]}
                      className="bg-orange-500 hover:bg-orange-600 text-xs"
                    >
                      {saving[goal.id] ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
