'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { WeightageFuelGauge } from '@/components/goals/WeightageFuelGauge'
import { GoalCard } from '@/components/goals/GoalCard'
import { GoalForm } from '@/components/goals/GoalForm'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { validateGoalSet, getRemainingWeightage, GOAL_RULES } from '@/lib/validations'
import { Goal, GoalCycle, GoalSheet, Profile, ThrustArea, GoalTemplate, SheetStatus } from '@/types'
import { Plus, Send, AlertCircle, CheckCircle2, Clock, Target, Zap } from 'lucide-react'

interface GoalsClientProps {
  profile: Profile
  activeCycle: GoalCycle | null
  sheet: GoalSheet | null
  initialGoals: unknown[]
  thrustAreas: ThrustArea[]
  templates: GoalTemplate[]
}

const STATUS_META: Record<SheetStatus, { label: string; color: string; bg: string; icon: typeof CheckCircle2 }> = {
  draft:     { label: 'Draft',     color: '#8888a3', bg: 'rgba(136,136,163,0.08)', icon: Target },
  submitted: { label: 'Submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: Clock },
  approved:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2 },
  returned:  { label: 'Returned',  color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  icon: AlertCircle },
}

export function GoalsClient({
  profile,
  activeCycle,
  sheet: initialSheet,
  initialGoals,
  thrustAreas,
  templates,
}: GoalsClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [sheet, setSheet] = useState<GoalSheet | null>(initialSheet)
  const [goals, setGoals] = useState<Goal[]>(initialGoals as Goal[])
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [requestingChange, setRequestingChange] = useState(false)
  const [changeReason, setChangeReason] = useState('')
  const [savingRequest, setSavingRequest] = useState(false)

  const sheetStatus: SheetStatus = sheet?.status ?? 'draft'
  const statusMeta = STATUS_META[sheetStatus]
  const StatusIcon = statusMeta.icon
  const isLocked = sheetStatus === 'approved'
  const isSubmitted = sheetStatus === 'submitted'
  const isDraft = sheetStatus === 'draft' || sheetStatus === 'returned'
  const usedWeight = goals.reduce((s, g) => s + g.weightage, 0)
  const remaining = getRemainingWeightage(goals)
  const canAddMore = goals.length < GOAL_RULES.MAX_GOALS && !isLocked && !isSubmitted

  async function ensureSheet(): Promise<string | null> {
    if (sheet) return sheet.id
    if (!activeCycle) return null
    const { data, error } = await supabase
      .from('goal_sheets')
      .insert({ employee_id: profile.id, cycle_id: activeCycle.id, status: 'draft' })
      .select()
      .single()
    if (error) { toast.error('Could not create goal sheet'); return null }
    setSheet(data)
    return data.id
  }

  async function handleAddGoal(formData: {
    thrust_area_id: string; title: string; description?: string
    uom_type: string; target_value?: string; target_date?: string; weightage: number
  }) {
    const sheetId = await ensureSheet()
    if (!sheetId) return
    const payload = {
      sheet_id: sheetId,
      thrust_area_id: formData.thrust_area_id,
      title: formData.title,
      description: formData.description || null,
      uom_type: formData.uom_type,
      target_value: formData.target_value ? parseFloat(formData.target_value) : null,
      target_date: formData.target_date || null,
      weightage: formData.weightage,
      position: goals.length,
    }
    const { data, error } = await supabase.from('goals').insert(payload).select('*, thrust_area:thrust_areas(*)').single()
    if (error) { toast.error('Could not add goal'); return }
    setGoals(prev => [...prev, data])
    setDrawerOpen(false)
    toast.success('Goal added')
  }

  async function handleDeleteGoal(id: string) {
    const { error } = await supabase.from('goals').delete().eq('id', id)
    if (error) { toast.error('Could not remove goal'); return }
    setGoals(prev => prev.filter(g => g.id !== id))
    toast.success('Goal removed')
  }

  async function handleWeightageChange(id: string, newWeight: number) {
    const { error } = await supabase.from('goals').update({ weightage: newWeight }).eq('id', id)
    if (error) { toast.error('Could not update weightage'); return }
    setGoals(prev => prev.map(g => g.id === id ? { ...g, weightage: newWeight } : g))
  }

  async function handleWithdraw() {
    if (!sheet) return
    setSubmitting(true)
    const { error } = await supabase.from('goal_sheets').update({ status: 'draft', submitted_at: null }).eq('id', sheet.id)
    if (error) { toast.error('Could not withdraw submission'); setSubmitting(false); return }
    setSheet(prev => prev ? { ...prev, status: 'draft' } : prev)
    toast.success('Submission withdrawn. You can now edit your goals.')
    setSubmitting(false)
    router.refresh()
  }

  async function handleSubmit() {
    const errors = validateGoalSet(goals)
    if (errors.length > 0) { errors.forEach(e => toast.error(e)); return }
    setSubmitting(true)
    const sheetId = await ensureSheet()
    if (!sheetId) { setSubmitting(false); return }
    const { error } = await supabase.from('goal_sheets').update({ status: 'submitted', submitted_at: new Date().toISOString() }).eq('id', sheetId)
    if (error) { toast.error('Could not submit goals'); setSubmitting(false); return }
    setSheet(prev => prev ? { ...prev, status: 'submitted' } : prev)
    toast.success('Goals submitted for approval!')
    setSubmitting(false)
    router.refresh()
    fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'submitted', sheetId }) }).catch(() => {})
  }

  async function submitChangeRequest() {
    if (!changeReason.trim()) { toast.error('Add a reason for your request'); return }
    if (!sheet) return
    setSavingRequest(true)
    const { error } = await supabase.from('audit_log').insert({
      actor_id: profile.id, action: 'change_requested',
      entity_type: 'goal_sheets', entity_id: sheet.id, reason: changeReason,
    })
    if (error) { toast.error('Could not submit request') }
    else { toast.success('Request sent to admin'); setRequestingChange(false); setChangeReason('') }
    setSavingRequest(false)
  }

  const closes = activeCycle?.closes_at
    ? new Date(activeCycle.closes_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
    : null

  return (
    <AppShell role="employee" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-5xl space-y-8 p-6 pb-32">

        {/* ── Page Header ── */}
        <div className="flex flex-col gap-6 border-b pb-8 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--border)' }}>
          <div className="space-y-3">
            {/* Status badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]"
              style={{ background: statusMeta.bg, color: statusMeta.color }}
            >
              <StatusIcon className="h-3 w-3" />
              {statusMeta.label}
            </div>
            <h1
              className="text-5xl font-extrabold uppercase leading-none tracking-tight sm:text-6xl"
              style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
            >
              Goals<br />System
            </h1>
            <p className="text-xs font-bold uppercase tracking-[0.25em]" style={{ color: 'var(--muted-foreground)' }}>
              {activeCycle ? activeCycle.name : 'No active cycle'}
              {closes && ` — closes ${closes}`}
            </p>
          </div>

          {/* Action buttons */}
          {isDraft && (
            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => setDrawerOpen(true)}
                disabled={!canAddMore}
                variant="outline"
                className="h-12 rounded-2xl border px-6 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{ borderColor: 'var(--border)', color: 'var(--foreground)' }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add Goal
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || usedWeight !== 100 || goals.length === 0}
                className="h-12 rounded-2xl px-8 text-[10px] font-black uppercase tracking-widest transition-all"
                style={{
                  background: usedWeight === 100 ? '#f59e0b' : 'var(--muted)',
                  color: usedWeight === 100 ? '#09090f' : 'var(--muted-foreground)',
                  boxShadow: usedWeight === 100 ? '0 0 20px rgba(245,158,11,0.35)' : '',
                }}
              >
                <Send className="mr-2 h-4 w-4" />
                {submitting ? 'Submitting...' : 'Submit Goals'}
              </Button>
            </div>
          )}
          {isSubmitted && (
            <Button
              variant="outline"
              onClick={handleWithdraw}
              disabled={submitting}
              className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest"
              style={{ borderColor: '#3b82f6', color: '#3b82f6' }}
            >
              {submitting ? 'Withdrawing...' : 'Withdraw Submission'}
            </Button>
          )}
          {isLocked && (
            <Button
              variant="outline"
              onClick={() => setRequestingChange(true)}
              className="h-12 rounded-2xl px-6 text-[10px] font-black uppercase tracking-widest"
              style={{ borderColor: '#10b981', color: '#10b981' }}
            >
              Request Changes
            </Button>
          )}
        </div>

        {/* ── Banners ── */}
        {sheetStatus === 'returned' && sheet?.return_reason && (
          <div
            className="flex items-start gap-3 rounded-2xl border p-4"
            style={{ background: 'rgba(244,63,94,0.06)', borderColor: 'rgba(244,63,94,0.25)' }}
          >
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" style={{ color: '#f43f5e' }} />
            <div>
              <p className="text-xs font-black uppercase tracking-wider" style={{ color: '#f43f5e' }}>Manager Feedback</p>
              <p className="mt-1 text-sm" style={{ color: 'var(--foreground)' }}>{sheet.return_reason}</p>
            </div>
          </div>
        )}
        {isSubmitted && (
          <div
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}
          >
            <Clock className="h-5 w-5 shrink-0" style={{ color: '#3b82f6' }} />
            <p className="text-sm font-medium" style={{ color: '#3b82f6' }}>
              Goals submitted — awaiting manager approval.
            </p>
          </div>
        )}
        {isLocked && (
          <div
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
          >
            <CheckCircle2 className="h-5 w-5 shrink-0" style={{ color: '#10b981' }} />
            <p className="text-sm font-medium" style={{ color: '#10b981' }}>
              Goals approved and locked. Check-in is now open.
            </p>
          </div>
        )}
        {activeCycle?.phase && ['q1','q2','q3','q4'].includes(activeCycle.phase) && (
          <div
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{ background: 'rgba(245,158,11,0.06)', borderColor: 'rgba(245,158,11,0.2)' }}
          >
            <Zap className="h-5 w-5 shrink-0" style={{ color: '#f59e0b' }} />
            <p className="text-sm font-medium" style={{ color: '#f59e0b' }}>
              {activeCycle.phase.toUpperCase()} check-in is active. Record your progress in the Check-in tab.
            </p>
          </div>
        )}

        {/* ── Goals Grid ── */}
        {goals.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-6 rounded-3xl border-2 border-dashed py-24 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="flex h-16 w-16 items-center justify-center rounded-2xl"
              style={{ background: 'var(--muted)' }}
            >
              <Target className="h-8 w-8" style={{ color: 'var(--muted-foreground)' }} />
            </div>
            <div className="space-y-2">
              <p className="text-xl font-black uppercase tracking-tight" style={{ fontFamily: 'var(--font-syne)', color: 'var(--muted-foreground)' }}>
                No Goals Yet
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {isDraft ? 'Click "Add Goal" to get started.' : 'No goals on this sheet.'}
              </p>
            </div>
            {isDraft && (
              <Button
                onClick={() => setDrawerOpen(true)}
                className="h-12 rounded-2xl px-8 text-xs font-black uppercase tracking-widest"
                style={{ background: '#f59e0b', color: '#09090f' }}
              >
                <Plus className="mr-2 h-4 w-4" /> Add First Goal
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {goals.map(goal => (
              <GoalCard
                key={goal.id}
                goal={goal}
                sheetStatus={sheetStatus}
                onDelete={!isLocked && !isSubmitted && !goal.is_shared ? handleDeleteGoal : undefined}
                onWeightageChange={goal.is_shared && !isLocked && !isSubmitted ? handleWeightageChange : undefined}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Weightage Gauge Bar ── */}
      {!isLocked && goals.length > 0 && (
        <div className="fixed bottom-0 left-1/2 z-50 w-full max-w-xl -translate-x-1/2">
          <div
            style={{
              background: 'var(--card)',
              borderTop: '2px solid #f59e0b',
              borderLeft: '1px solid var(--border)',
              borderRight: '1px solid var(--border)',
              borderRadius: '12px 12px 0 0',
              padding: '16px 20px 20px',
              boxShadow: '0 -8px 28px rgba(0,0,0,0.22)',
            }}
          >
            <WeightageFuelGauge used={usedWeight} />
          </div>
        </div>
      )}

      {/* ── Change Request Dialog ── */}
      <Dialog open={requestingChange} onOpenChange={(o) => { if (!o) { setRequestingChange(false); setChangeReason('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-syne)' }}>Request goal changes</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Your admin will review this request and unlock your sheet if approved.
            </p>
            <Textarea
              value={changeReason}
              onChange={(e) => setChangeReason(e.target.value)}
              placeholder="e.g. My role changed and one goal is no longer relevant"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setRequestingChange(false); setChangeReason('') }}>Cancel</Button>
            <Button
              onClick={submitChangeRequest}
              disabled={savingRequest}
              style={{ background: '#f59e0b', color: '#09090f' }}
            >
              {savingRequest ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Add Goal Dialog ── */}
      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-syne)' }}>Add a new goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            thrustAreas={thrustAreas}
            templates={templates}
            remainingWeightage={remaining}
            onSubmit={handleAddGoal}
            onCancel={() => setDrawerOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
