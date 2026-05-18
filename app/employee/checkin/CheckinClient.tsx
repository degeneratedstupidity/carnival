'use client'

import { useState } from 'react'
import Link from 'next/link'
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
import { ChevronLeft } from 'lucide-react'

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
  const [coaching, setCoaching] = useState<Record<string, string>>({})
  const [loadingCoaching, setLoadingCoaching] = useState<Record<string, boolean>>({})

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
      // Sync actuals to any shared goals linked to this one
      if (!goal.is_shared) {
        const { data: linkedGoals } = await supabase
          .from('goals')
          .select('id')
          .eq('shared_from_goal_id', goal.id)
        for (const linked of linkedGoals ?? []) {
          await supabase.from('check_ins').upsert({
            ...payload,
            goal_id: linked.id,
          }, { onConflict: 'goal_id,quarter' })
        }
      }
      // Fire-and-forget AI coaching
      setLoadingCoaching(prev => ({ ...prev, [goal.id]: true }))
      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id,
          goalId: goal.id,
          goalTitle: goal.title,
          uomType: goal.uom_type,
          targetValue: goal.target_value,
          targetDate: goal.target_date,
          actualValue: ci.actual_value ?? null,
          actualDate: ci.actual_date ?? null,
          score,
          quarter: currentQuarter,
        }),
      })
        .then(r => r.json())
        .then(data => { if (data.coaching) setCoaching(prev => ({ ...prev, [goal.id]: data.coaching })) })
        .catch(() => {})
        .finally(() => setLoadingCoaching(prev => ({ ...prev, [goal.id]: false })))
    }
    setSaving(prev => ({ ...prev, [goal.id]: false }))
  }

  const quarterLabel = currentQuarter.toUpperCase()

  return (
    <AppShell role="employee" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <Link href="/employee/goals" className="mb-3 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-800">
            <ChevronLeft className="h-3.5 w-3.5" /> Back to my goals
          </Link>
          <h1 className="text-xl font-bold text-slate-900">{quarterLabel} Check-in</h1>
          <p className="text-sm text-slate-500">{activeCycle.name} — Record what you achieved this quarter</p>
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
                        ? (goal.target_date ?? 'Not set')
                        : goal.uom_type === 'zero'
                        ? '0 (zero incidents)'
                        : goal.target_value != null
                        ? `${goal.target_value}${goal.uom_type.includes('percent') ? '%' : ''}`
                        : 'Not set'}
                    </p>

                    <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
                      {needsValue && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">What you achieved</label>
                          <Input
                            type="number"
                            value={ci.actual_value ?? ''}
                            onChange={(e) => updateLocal(goal.id, { actual_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                            placeholder="Enter actual value"
                            className="h-8 text-sm"
                          />
                        </div>
                      )}
                      {needsDate && (
                        <div className="space-y-1">
                          <label className="text-xs font-medium text-slate-600">Date completed</label>
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
                          <label className="text-xs font-medium text-slate-600">Incidents recorded</label>
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
                        <label className="text-xs font-medium text-slate-600">How is this going?</label>
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

                  <div className="flex flex-col items-center gap-1">
                    <ScoreRing score={score} size={60} />
                    <span className="text-xs text-slate-400">Score</span>
                    <Button
                      size="sm"
                      onClick={() => saveCheckin(goal)}
                      disabled={saving[goal.id]}
                      className="bg-orange-500 hover:bg-orange-600 text-xs"
                    >
                      {saving[goal.id] ? 'Saving...' : 'Save'}
                    </Button>
                  </div>
                  {loadingCoaching[goal.id] && (
                    <p className="mt-2 text-xs text-slate-400 italic text-center">Getting insight...</p>
                  )}
                  {coaching[goal.id] && (
                    <p className="mt-2 rounded bg-blue-50 px-2 py-1.5 text-xs text-blue-700 leading-relaxed">
                      {coaching[goal.id]}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
