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
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { validateGoalSet, getRemainingWeightage, GOAL_RULES } from '@/lib/validations'
import { Goal, GoalCycle, GoalSheet, Profile, ThrustArea, GoalTemplate, SheetStatus } from '@/types'

interface GoalsClientProps {
  profile: Profile
  activeCycle: GoalCycle | null
  sheet: GoalSheet | null
  initialGoals: unknown[]
  thrustAreas: ThrustArea[]
  templates: GoalTemplate[]
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
  const isLocked = sheetStatus === 'approved'
  const isSubmitted = sheetStatus === 'submitted'
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
    thrust_area_id: string
    title: string
    description?: string
    uom_type: string
    target_value?: string
    target_date?: string
    weightage: number
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

    const { data, error } = await supabase
      .from('goals')
      .insert(payload)
      .select('*, thrust_area:thrust_areas(*)')
      .single()

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
    const { error } = await supabase
      .from('goal_sheets')
      .update({ status: 'draft', submitted_at: null })
      .eq('id', sheet.id)
    if (error) { toast.error('Could not withdraw submission'); setSubmitting(false); return }
    setSheet(prev => prev ? { ...prev, status: 'draft' } : prev)
    toast.success('Submission withdrawn. You can now edit your goals.')
    setSubmitting(false)
    router.refresh()
  }

  async function handleSubmit() {
    const errors = validateGoalSet(goals)
    if (errors.length > 0) {
      errors.forEach(e => toast.error(e))
      return
    }
    setSubmitting(true)
    const sheetId = await ensureSheet()
    if (!sheetId) { setSubmitting(false); return }

    const { error } = await supabase
      .from('goal_sheets')
      .update({ status: 'submitted', submitted_at: new Date().toISOString() })
      .eq('id', sheetId)

    if (error) { toast.error('Could not submit goals'); setSubmitting(false); return }

    setSheet(prev => prev ? { ...prev, status: 'submitted' } : prev)
    toast.success('Goals submitted for approval')
    setSubmitting(false)
    router.refresh()
  }

  async function submitChangeRequest() {
    if (!changeReason.trim()) { toast.error('Add a reason for your request'); return }
    if (!sheet) return
    setSavingRequest(true)
    const { error } = await supabase.from('audit_log').insert({
      actor_id: profile.id,
      action: 'change_requested',
      entity_type: 'goal_sheets',
      entity_id: sheet.id,
      reason: changeReason,
    })
    if (error) { toast.error('Could not submit request'); }
    else { toast.success('Request sent to admin'); setRequestingChange(false); setChangeReason('') }
    setSavingRequest(false)
  }

  const CycleBanner = () => {
    if (!activeCycle) return null
    const phase = activeCycle.phase
    const closes = activeCycle.closes_at ? new Date(activeCycle.closes_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : ''

    if (phase === 'goal_setting') {
      return (
        <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
          Goal submission is open
          {closes && ` — closes on ${closes}`}.
          {' '}You have {goals.length} goal{goals.length !== 1 ? 's' : ''} added.
        </div>
      )
    }
    if (['q1', 'q2', 'q3', 'q4'].includes(phase)) {
      return (
        <div className="mb-4 rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
          {phase.toUpperCase()} check-in is open. Log your actuals in the Check-in tab.
        </div>
      )
    }
    return null
  }

  return (
    <AppShell role="employee" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">My Goals</h1>
            <p className="text-sm text-slate-500">
              {activeCycle ? activeCycle.name : 'No active cycle'}
            </p>
          </div>
          {!isLocked && !isSubmitted && (
            <Button
              onClick={() => setDrawerOpen(true)}
              disabled={!canAddMore}
              className="bg-orange-500 hover:bg-orange-600"
            >
              Add goal
            </Button>
          )}
        </div>

        <CycleBanner />

        {isLocked && (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800 flex items-center justify-between gap-4">
            <span>Your goals are approved and locked.</span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setRequestingChange(true)}
              className="shrink-0 border-green-400 text-green-800 hover:bg-green-100 text-xs"
            >
              Request changes
            </Button>
          </div>
        )}
        {isSubmitted && (
          <div className="mb-4 rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-800">
            Goals submitted. Waiting for manager approval.
          </div>
        )}
        {sheet?.return_reason && sheetStatus === 'returned' && (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            Returned for rework: {sheet.return_reason}
          </div>
        )}

        {!isLocked && goals.length > 0 && (
          <div className="mb-4">
            <WeightageFuelGauge used={usedWeight} />
          </div>
        )}

        {goals.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm font-medium text-slate-600">No goals added yet</p>
            <p className="mt-1 text-xs text-slate-400">Click Add goal to get started</p>
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

        {!isLocked && !isSubmitted && goals.length > 0 && (
          <div className="mt-6">
            <Button
              onClick={handleSubmit}
              disabled={submitting || usedWeight !== 100 || goals.length === 0}
              className="w-full bg-orange-500 hover:bg-orange-600"
            >
              {submitting ? 'Submitting...' : 'Submit goals for approval'}
            </Button>
            {usedWeight !== 100 && (
              <p className="mt-1 text-center text-xs text-slate-400">
                Total weightage must equal 100% before submitting
              </p>
            )}
          </div>
        )}
        {isSubmitted && !isLocked && (
          <div className="mt-4">
            <Button
              variant="outline"
              onClick={handleWithdraw}
              disabled={submitting}
              className="w-full border-slate-300 text-slate-600 hover:bg-slate-50"
            >
              {submitting ? 'Withdrawing...' : 'Withdraw submission'}
            </Button>
            <p className="mt-1 text-center text-xs text-slate-400">
              This returns your goals to draft so you can edit or delete them.
            </p>
          </div>
        )}
      </div>

      <Dialog open={requestingChange} onOpenChange={(o) => { if (!o) { setRequestingChange(false); setChangeReason('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Request goal changes</DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <p className="mb-3 text-sm text-slate-600">
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
            <Button onClick={submitChangeRequest} disabled={savingRequest} className="bg-orange-500 hover:bg-orange-600">
              {savingRequest ? 'Sending...' : 'Send request'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Add a new goal</DialogTitle>
          </DialogHeader>
          <GoalForm
            userId={profile.id}
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
