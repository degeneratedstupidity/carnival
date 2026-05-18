'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { AppShell } from '@/components/layout/AppShell'
import { WeightageFuelGauge } from '@/components/goals/WeightageFuelGauge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { Goal, GoalSheet, Profile, UoMType } from '@/types'
import { Pencil, Check, X, ChevronLeft, CheckCircle2, RotateCcw, Lock } from 'lucide-react'
import { uomLabel } from '@/lib/scoring'
import Link from 'next/link'

interface ApprovalClientProps {
  manager: Profile
  sheet: GoalSheet
  employee: Profile | null
  initialGoals: Goal[]
}

const STATUS_META: Record<string, { color: string; bg: string }> = {
  submitted: { color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
  approved:  { color: '#10b981', bg: 'rgba(16,185,129,0.08)' },
  returned:  { color: '#f43f5e', bg: 'rgba(244,63,94,0.08)' },
  draft:     { color: '#8888a3', bg: 'rgba(136,136,163,0.08)' },
}

export function ApprovalClient({ manager, sheet, employee, initialGoals }: ApprovalClientProps) {
  const router = useRouter()
  const supabase = createClient()
  const [goals, setGoals] = useState<Goal[]>(initialGoals)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editBuffer, setEditBuffer] = useState<{ target_value?: number; target_date?: string; weightage?: number }>({})
  const [returnDialogOpen, setReturnDialogOpen] = useState(false)
  const [returnReason, setReturnReason] = useState('')
  const [loading, setLoading] = useState(false)

  const usedWeight = goals.reduce((s, g) => s + g.weightage, 0)
  const canApprove = usedWeight === 100 && sheet.status === 'submitted'
  const isAlreadyApproved = sheet.status === 'approved'
  const statusMeta = STATUS_META[sheet.status] ?? STATUS_META.draft

  function startEdit(goal: Goal) {
    setEditingId(goal.id)
    setEditBuffer({ target_value: goal.target_value ?? undefined, target_date: goal.target_date ?? undefined, weightage: goal.weightage })
  }

  async function saveEdit(goal: Goal) {
    const patch: Partial<Goal> = {}
    if (editBuffer.target_value !== undefined) patch.target_value = editBuffer.target_value
    if (editBuffer.target_date !== undefined) patch.target_date = editBuffer.target_date
    if (editBuffer.weightage !== undefined) patch.weightage = editBuffer.weightage
    const { error } = await supabase.from('goals').update(patch).eq('id', goal.id)
    if (error) { toast.error('Could not save changes'); return }
    await supabase.from('audit_log').insert({
      actor_id: manager.id, action: 'goal_edited_by_manager',
      entity_type: 'goals', entity_id: goal.id,
      old_values: { target_value: goal.target_value, weightage: goal.weightage },
      new_values: patch,
    })
    setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, ...patch } : g))
    setEditingId(null)
    toast.success('Changes saved')
  }

  async function approveSheet() {
    setLoading(true)
    const { error } = await supabase.from('goal_sheets').update({
      status: 'approved', approved_at: new Date().toISOString(), approved_by: manager.id,
    }).eq('id', sheet.id)
    if (error) { toast.error('Could not approve'); setLoading(false); return }
    await supabase.from('audit_log').insert({
      actor_id: manager.id, action: 'sheet_approved', entity_type: 'goal_sheets', entity_id: sheet.id,
    })
    toast.success('Goals approved!')
    router.push('/manager/approvals')
    router.refresh()
    fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'approved', sheetId: sheet.id }) }).catch(() => {})
  }

  async function returnSheet() {
    if (!returnReason.trim()) { toast.error('Please add a reason'); return }
    setLoading(true)
    const { error } = await supabase.from('goal_sheets').update({ status: 'returned', return_reason: returnReason }).eq('id', sheet.id)
    if (error) { toast.error('Could not return sheet'); setLoading(false); return }
    await supabase.from('audit_log').insert({
      actor_id: manager.id, action: 'sheet_returned', entity_type: 'goal_sheets', entity_id: sheet.id,
      new_values: { reason: returnReason },
    })
    toast.success('Sheet returned for rework')
    setReturnDialogOpen(false)
    router.push('/manager/approvals')
    router.refresh()
    fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'returned', sheetId: sheet.id, reason: returnReason }) }).catch(() => {})
  }

  return (
    <AppShell role="manager" name={manager.name} department={manager.department}>
      <div className="mx-auto max-w-4xl space-y-8 p-6">

        {/* ── Header ── */}
        <div>
          <Link
            href="/manager/approvals"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Back to Approvals
          </Link>

          <div className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h1
                className="text-4xl font-extrabold uppercase leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
              >
                Review Goals
              </h1>
              <p className="mt-2 text-lg font-bold" style={{ color: 'var(--foreground)' }}>
                {employee?.name}
              </p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {employee?.department ?? employee?.email}
              </p>
              {sheet.submitted_at && (
                <p className="mt-1 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                  Submitted {new Date(sheet.submitted_at).toLocaleDateString('en-IN', { dateStyle: 'medium' })}
                </p>
              )}
            </div>
            <span
              className="inline-block rounded-full px-4 py-1.5 text-xs font-black uppercase tracking-widest"
              style={{ background: statusMeta.bg, color: statusMeta.color }}
            >
              {sheet.status}
            </span>
          </div>
        </div>

        {/* ── Fuel gauge ── */}
        <WeightageFuelGauge used={usedWeight} />

        {/* ── Goals table ── */}
        <div
          className="overflow-x-auto rounded-2xl border"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Goal</th>
                <th className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Measurement</th>
                <th className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Target</th>
                <th className="px-5 py-3.5 text-right text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Weight</th>
                {!isAlreadyApproved && (
                  <th className="px-5 py-3.5 text-center text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Edit</th>
                )}
              </tr>
            </thead>
            <tbody>
              {goals.map(goal => {
                const isEditing = editingId === goal.id
                return (
                  <tr key={goal.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td className="px-5 py-4">
                      <p className="font-bold" style={{ color: 'var(--foreground)' }}>{goal.title}</p>
                      {goal.description && (
                        <p className="mt-0.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>{goal.description}</p>
                      )}
                      {goal.thrust_area && (
                        <span
                          className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white"
                          style={{ background: goal.thrust_area.color }}
                        >
                          {goal.thrust_area.name}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                      {uomLabel(goal.uom_type as UoMType)}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isEditing ? (
                        goal.uom_type === 'timeline' ? (
                          <Input type="date" value={editBuffer.target_date ?? ''} onChange={e => setEditBuffer(p => ({ ...p, target_date: e.target.value }))} className="h-7 w-36 text-xs" />
                        ) : (
                          <Input type="number" value={editBuffer.target_value ?? ''} onChange={e => setEditBuffer(p => ({ ...p, target_value: parseFloat(e.target.value) }))} className="h-7 w-24 text-xs" />
                        )
                      ) : (
                        <span className="font-medium" style={{ color: 'var(--foreground)' }}>
                          {goal.target_date ?? goal.target_value ?? '—'}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-right">
                      {isEditing ? (
                        <Input type="number" min={10} max={100} value={editBuffer.weightage ?? ''} onChange={e => setEditBuffer(p => ({ ...p, weightage: parseInt(e.target.value) }))} className="h-7 w-20 text-xs" />
                      ) : (
                        <span
                          className="rounded-full px-2 py-1 text-xs font-black"
                          style={{ background: 'var(--muted)', color: 'var(--foreground)' }}
                        >
                          {goal.weightage}%
                        </span>
                      )}
                    </td>
                    {!isAlreadyApproved && (
                      <td className="px-5 py-4 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => saveEdit(goal)} className="rounded-lg p-1.5 transition-colors" style={{ color: '#10b981', background: 'rgba(16,185,129,0.1)' }}>
                              <Check className="h-4 w-4" />
                            </button>
                            <button onClick={() => setEditingId(null)} className="rounded-lg p-1.5 transition-colors" style={{ color: '#f43f5e', background: 'rgba(244,63,94,0.1)' }}>
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(goal)} className="rounded-lg p-1.5 transition-colors" style={{ color: 'var(--muted-foreground)', background: 'var(--muted)' }}>
                            <Pencil className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* ── Action buttons ── */}
        {sheet.status === 'submitted' && (
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(true)}
              disabled={loading}
              className="h-12 flex-1 rounded-2xl text-xs font-black uppercase tracking-widest"
              style={{ borderColor: 'rgba(244,63,94,0.4)', color: '#f43f5e' }}
            >
              <RotateCcw className="mr-2 h-4 w-4" />
              Return for Rework
            </Button>
            <Button
              onClick={approveSheet}
              disabled={!canApprove || loading}
              className="h-12 flex-1 rounded-2xl text-xs font-black uppercase tracking-widest"
              style={{
                background: canApprove ? '#10b981' : 'var(--muted)',
                color: canApprove ? 'white' : 'var(--muted-foreground)',
                boxShadow: canApprove ? '0 0 20px rgba(16,185,129,0.3)' : '',
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              {loading ? 'Approving...' : 'Approve Goals'}
            </Button>
          </div>
        )}
        {!canApprove && !isAlreadyApproved && usedWeight !== 100 && sheet.status === 'submitted' && (
          <p className="text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Total weightage must equal 100% before approving (currently {usedWeight}%)
          </p>
        )}
        {isAlreadyApproved && (
          <div
            className="flex items-center gap-3 rounded-2xl border p-4"
            style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
          >
            <Lock className="h-4 w-4 shrink-0" style={{ color: '#10b981' }} />
            <p className="text-sm font-medium" style={{ color: '#10b981' }}>
              These goals are approved and locked.
            </p>
          </div>
        )}
        {sheet.status === 'draft' && (
          <p className="text-center text-xs" style={{ color: 'var(--muted-foreground)' }}>
            Employee has not submitted goals yet
          </p>
        )}
      </div>

      {/* ── Return dialog ── */}
      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle style={{ fontFamily: 'var(--font-syne)' }}>Return for Rework</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
              Tell the employee what needs to be changed.
            </p>
            <Textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Increase weightage for the revenue goal, reduce for the training goal"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button
              onClick={returnSheet}
              disabled={loading}
              style={{ background: '#f43f5e', color: 'white' }}
            >
              Return Sheet
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
