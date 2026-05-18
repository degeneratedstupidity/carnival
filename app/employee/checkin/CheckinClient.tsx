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
import { ChevronLeft, Sparkles, Save, Target, TrendingUp, CheckCircle2, Clock } from 'lucide-react'

interface CheckinClientProps {
  profile: Profile
  activeCycle: GoalCycle
  goals: Goal[]
  initialCheckIns: CheckIn[]
  currentQuarter: string
}

const QUARTERS = ['q1', 'q2', 'q3', 'q4']

const STATUS_META: Record<string, { color: string; bg: string; label: string; icon: typeof CheckCircle2 }> = {
  not_started: { color: '#8888a3', bg: 'rgba(136,136,163,0.1)', label: 'Not Started', icon: Clock },
  on_track:    { color: '#3b82f6', bg: 'rgba(59,130,246,0.1)',  label: 'On Track',    icon: TrendingUp },
  completed:   { color: '#10b981', bg: 'rgba(16,185,129,0.1)',  label: 'Completed',   icon: CheckCircle2 },
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
      goal.uom_type as UoMType, goal.target_value,
      ci.actual_value ?? null, goal.target_date, ci.actual_date ?? null,
    )
    const payload = {
      goal_id: goal.id, cycle_id: activeCycle.id, quarter: currentQuarter,
      actual_value: ci.actual_value ?? null, actual_date: ci.actual_date ?? null,
      progress_status: ci.progress_status ?? 'not_started',
      computed_score: score, updated_at: new Date().toISOString(),
    }
    const { error } = await supabase.from('check_ins').upsert(payload, { onConflict: 'goal_id,quarter' })
    if (error) {
      toast.error('Could not save check-in')
    } else {
      toast.success('Check-in saved!')
      if (!goal.is_shared) {
        const { data: linkedGoals } = await supabase.from('goals').select('id').eq('shared_from_goal_id', goal.id)
        for (const linked of linkedGoals ?? []) {
          await supabase.from('check_ins').upsert({ ...payload, goal_id: linked.id }, { onConflict: 'goal_id,quarter' })
        }
      }
      setLoadingCoaching(prev => ({ ...prev, [goal.id]: true }))
      fetch('/api/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: profile.id, goalId: goal.id, goalTitle: goal.title,
          uomType: goal.uom_type, targetValue: goal.target_value, targetDate: goal.target_date,
          actualValue: ci.actual_value ?? null, actualDate: ci.actual_date ?? null,
          score, quarter: currentQuarter,
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
  const totalGoals = goals.length
  const submittedGoals = goals.filter(g => {
    const ci = checkIns[g.id]
    return ci?.computed_score != null && ci.computed_score > 0
  }).length
  const avgScore = goals.length === 0 ? 0 : Math.round(
    goals.reduce((sum, g) => sum + (checkIns[g.id]?.computed_score ?? 0), 0) / goals.length
  )

  return (
    <AppShell role="employee" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-4xl space-y-8 p-6">

        {/* ── Header ── */}
        <div>
          <Link
            href="/employee/goals"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest transition-colors"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Goals
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#f59e0b' }}>
                {activeCycle.name}
              </p>
              <h1
                className="text-5xl font-extrabold uppercase leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
              >
                Quarterly<br />Check-in
              </h1>
            </div>

            {/* Quarter tabs */}
            <div
              className="flex gap-1 rounded-2xl p-1"
              style={{ background: 'var(--muted)', border: '1px solid var(--border)' }}
            >
              {QUARTERS.map(q => (
                <div
                  key={q}
                  className="rounded-xl px-4 py-2 text-xs font-black uppercase tracking-widest"
                  style={
                    q === currentQuarter
                      ? { background: '#f59e0b', color: '#09090f' }
                      : { color: 'var(--muted-foreground)' }
                  }
                >
                  {q.toUpperCase()}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Goals', value: totalGoals, color: 'var(--foreground)' },
            { label: 'Updated', value: submittedGoals, color: '#10b981' },
            { label: 'Avg Score', value: `${avgScore}%`, color: avgScore >= 80 ? '#10b981' : avgScore >= 50 ? '#f59e0b' : '#f43f5e' },
          ].map(stat => (
            <div
              key={stat.label}
              className="rounded-2xl border p-4 text-center"
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <p
                className="text-2xl font-extrabold"
                style={{ color: stat.color, fontFamily: 'var(--font-syne)' }}
              >
                {stat.value}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Goal Cards ── */}
        <div className="space-y-4">
          {goals.map(goal => {
            const ci = getCheckin(goal.id)
            const score = ci.computed_score ?? 0
            const needsDate = goal.uom_type === 'timeline'
            const needsValue = ['min_numeric', 'max_numeric', 'min_percent', 'max_percent'].includes(goal.uom_type)
            const isZero = goal.uom_type === 'zero'
            const statusKey = ci.progress_status ?? 'not_started'
            const statusInfo = STATUS_META[statusKey] ?? STATUS_META.not_started
            const StatusIcon = statusInfo.icon

            return (
              <div
                key={goal.id}
                className="rounded-2xl border p-5 transition-all"
                style={{
                  background: 'var(--card)',
                  borderColor: 'var(--border)',
                  boxShadow: score >= 100 ? `0 0 20px rgba(16,185,129,0.15)` : undefined,
                }}
              >
                {/* Goal header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      {goal.thrust_area && (
                        <span
                          className="rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white"
                          style={{ background: goal.thrust_area.color }}
                        >
                          {goal.thrust_area.name}
                        </span>
                      )}
                      <span
                        className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide"
                        style={{ background: statusInfo.bg, color: statusInfo.color }}
                      >
                        <StatusIcon className="h-2.5 w-2.5" />
                        {statusInfo.label}
                      </span>
                      <Badge variant="outline" className="text-[10px]" style={{ borderColor: 'var(--border)', color: 'var(--muted-foreground)' }}>
                        {goal.weightage}% weight
                      </Badge>
                    </div>
                    <h3
                      className="text-base font-black uppercase leading-tight tracking-tight"
                      style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
                    >
                      {goal.title}
                    </h3>
                    <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      Target:{' '}
                      {goal.uom_type === 'timeline'
                        ? (goal.target_date ?? 'Not set')
                        : goal.uom_type === 'zero'
                        ? '0 (zero incidents)'
                        : goal.target_value != null
                        ? `${goal.target_value}${goal.uom_type.includes('percent') ? '%' : ''}`
                        : 'Not set'}
                    </p>
                  </div>

                  {/* Score Ring */}
                  <div className="flex flex-col items-center gap-1.5">
                    <ScoreRing score={score} size={64} />
                    <span className="text-[9px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                      Score
                    </span>
                  </div>
                </div>

                {/* Inputs */}
                <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {needsValue && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                        Actual Value
                      </label>
                      <Input
                        type="number"
                        value={ci.actual_value ?? ''}
                        onChange={(e) => updateLocal(goal.id, { actual_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="Enter actual"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {needsDate && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                        Date Completed
                      </label>
                      <Input
                        type="date"
                        value={ci.actual_date ?? ''}
                        onChange={(e) => updateLocal(goal.id, { actual_date: e.target.value })}
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  {isZero && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                        Incidents
                      </label>
                      <Input
                        type="number" min={0}
                        value={ci.actual_value ?? ''}
                        onChange={(e) => updateLocal(goal.id, { actual_value: e.target.value ? parseFloat(e.target.value) : undefined })}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                  <div className="space-y-1">
                    <label className="text-xs font-bold uppercase tracking-wide" style={{ color: 'var(--muted-foreground)' }}>
                      Status
                    </label>
                    <Select
                      value={ci.progress_status ?? 'not_started'}
                      onValueChange={(v) => { if (v) updateLocal(goal.id, { progress_status: v as ProgressStatus }) }}
                    >
                      <SelectTrigger className="h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="not_started">Not Started</SelectItem>
                        <SelectItem value="on_track">On Track</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Action row */}
                <div className="flex items-center gap-3">
                  <Button
                    onClick={() => saveCheckin(goal)}
                    disabled={saving[goal.id]}
                    className="h-10 flex-1 rounded-xl text-xs font-black uppercase tracking-widest"
                    style={{ background: '#f59e0b', color: '#09090f' }}
                  >
                    <Save className="mr-2 h-3.5 w-3.5" />
                    {saving[goal.id] ? 'Saving...' : 'Save Check-in'}
                  </Button>
                  {loadingCoaching[goal.id] && (
                    <p className="text-xs italic" style={{ color: 'var(--muted-foreground)' }}>
                      Getting AI insight...
                    </p>
                  )}
                </div>

                {/* AI Coaching */}
                {coaching[goal.id] && (
                  <div
                    className="mt-4 rounded-xl border p-3"
                    style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}
                  >
                    <div className="mb-2 flex items-center gap-2">
                      <Sparkles className="h-3.5 w-3.5" style={{ color: '#f59e0b' }} />
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: '#f59e0b' }}>
                        AI Coach
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed" style={{ color: 'var(--foreground)' }}>
                      {coaching[goal.id]}
                    </p>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </AppShell>
  )
}
