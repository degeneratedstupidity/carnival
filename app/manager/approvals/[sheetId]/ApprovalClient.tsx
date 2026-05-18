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
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Goal, GoalSheet, Profile, UoMType } from '@/types'
import { Pencil, Check, X } from 'lucide-react'
import { uomLabel } from '@/lib/scoring'

interface ApprovalClientProps {
  manager: Profile
  sheet: GoalSheet
  employee: Profile | null
  initialGoals: Goal[]
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

    // Log to audit
    await supabase.from('audit_log').insert({
      actor_id: manager.id,
      action: 'goal_edited_by_manager',
      entity_type: 'goals',
      entity_id: goal.id,
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
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: manager.id,
    }).eq('id', sheet.id)

    if (error) { toast.error('Could not approve'); setLoading(false); return }

    await supabase.from('audit_log').insert({
      actor_id: manager.id,
      action: 'sheet_approved',
      entity_type: 'goal_sheets',
      entity_id: sheet.id,
    })

    toast.success('Goals approved')
    router.push('/manager/approvals')
    router.refresh()
    fetch('/api/emails', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ type: 'approved', sheetId: sheet.id }) }).catch(() => {})
  }

  async function returnSheet() {
    if (!returnReason.trim()) { toast.error('Please add a reason'); return }
    setLoading(true)
    const { error } = await supabase.from('goal_sheets').update({
      status: 'returned',
      return_reason: returnReason,
    }).eq('id', sheet.id)

    if (error) { toast.error('Could not return sheet'); setLoading(false); return }

    await supabase.from('audit_log').insert({
      actor_id: manager.id,
      action: 'sheet_returned',
      entity_type: 'goal_sheets',
      entity_id: sheet.id,
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
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6 flex items-start justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Review goals — {employee?.name}</h1>
            <p className="text-sm text-slate-500">{employee?.department ?? employee?.email}</p>
            {sheet.submitted_at && (
              <p className="text-xs text-slate-400">
                Submitted {new Date(sheet.submitted_at).toLocaleDateString('en-IN')}
              </p>
            )}
          </div>
          <Badge
            variant="outline"
            className="capitalize"
            style={{
              borderColor: sheet.status === 'approved' ? '#22c55e' : sheet.status === 'submitted' ? '#3b82f6' : '#94a3b8',
              color: sheet.status === 'approved' ? '#22c55e' : sheet.status === 'submitted' ? '#3b82f6' : '#94a3b8',
            }}
          >
            {sheet.status}
          </Badge>
        </div>

        <div className="mb-4">
          <WeightageFuelGauge used={usedWeight} />
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
          <table className="w-full text-sm">
            <thead className="border-b border-slate-100 bg-slate-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Goal</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Measurement type</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Target</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Weight</th>
                {!isAlreadyApproved && <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Edit</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {goals.map(goal => {
                const isEditing = editingId === goal.id
                return (
                  <tr key={goal.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="font-medium text-slate-900">{goal.title}</p>
                        {goal.description && <p className="text-xs text-slate-400">{goal.description}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{uomLabel(goal.uom_type as UoMType)}</td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        goal.uom_type === 'timeline' ? (
                          <Input type="date" value={editBuffer.target_date ?? ''} onChange={e => setEditBuffer(p => ({ ...p, target_date: e.target.value }))} className="h-7 w-32 text-xs" />
                        ) : (
                          <Input type="number" value={editBuffer.target_value ?? ''} onChange={e => setEditBuffer(p => ({ ...p, target_value: parseFloat(e.target.value) }))} className="h-7 w-24 text-xs" />
                        )
                      ) : (
                        <span className="text-slate-700">{goal.target_date ?? goal.target_value ?? '—'}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {isEditing ? (
                        <Input type="number" min={10} max={100} value={editBuffer.weightage ?? ''} onChange={e => setEditBuffer(p => ({ ...p, weightage: parseInt(e.target.value) }))} className="h-7 w-20 text-xs" />
                      ) : (
                        <span className="font-medium text-slate-700">{goal.weightage}%</span>
                      )}
                    </td>
                    {!isAlreadyApproved && (
                      <td className="px-4 py-3 text-center">
                        {isEditing ? (
                          <div className="flex justify-center gap-1">
                            <button onClick={() => saveEdit(goal)} className="rounded p-1 text-green-600 hover:bg-green-50"><Check className="h-4 w-4" /></button>
                            <button onClick={() => setEditingId(null)} className="rounded p-1 text-red-500 hover:bg-red-50"><X className="h-4 w-4" /></button>
                          </div>
                        ) : (
                          <button onClick={() => startEdit(goal)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"><Pencil className="h-4 w-4" /></button>
                        )}
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {sheet.status === 'submitted' && (
          <div className="mt-6 flex gap-3">
            <Button
              variant="outline"
              onClick={() => setReturnDialogOpen(true)}
              disabled={loading}
              className="flex-1 border-amber-300 text-amber-700 hover:bg-amber-50"
            >
              Return for rework
            </Button>
            <Button
              onClick={approveSheet}
              disabled={!canApprove || loading}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              {loading ? 'Approving...' : 'Approve goals'}
            </Button>
          </div>
        )}
        {!canApprove && !isAlreadyApproved && usedWeight !== 100 && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Total weightage must equal 100% before approving (currently {usedWeight}%)
          </p>
        )}
        {sheet.status === 'draft' && (
          <p className="mt-2 text-center text-xs text-slate-400">
            Employee has not submitted goals yet
          </p>
        )}
      </div>

      <Dialog open={returnDialogOpen} onOpenChange={setReturnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Return goals for rework</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">Tell the employee what needs to be changed.</p>
            <Textarea
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              placeholder="e.g. Increase weightage for the revenue goal, reduce for the training goal"
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReturnDialogOpen(false)}>Cancel</Button>
            <Button onClick={returnSheet} disabled={loading} className="bg-amber-500 hover:bg-amber-600">
              Return for rework
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AppShell>
  )
}
