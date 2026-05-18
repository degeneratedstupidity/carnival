'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Profile, ThrustArea, Goal } from '@/types'
import { Lock, Unlock, Share2 } from 'lucide-react'

interface ChangeRequest {
  entity_id: string
  reason: string
  created_at: string
}

interface AdminGoalsClientProps {
  adminId: string
  employees: Profile[]
  thrustAreas: ThrustArea[]
  approvedSheets: Array<{
    id: string
    employee: Profile | null
    goals: Goal[]
  }>
  changeRequests: ChangeRequest[]
}

export function AdminGoalsClient({ adminId, employees, approvedSheets, changeRequests }: AdminGoalsClientProps) {
  const supabase = createClient()
  const [unlockingGoal, setUnlockingGoal] = useState<Goal | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [sheets, setSheets] = useState(approvedSheets)

  // Push shared goal state
  const [pushingGoal, setPushingGoal] = useState<{ goal: Goal; sheetOwner: string } | null>(null)
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set())
  const [pushing, setPushing] = useState(false)

  async function unlockGoalSheet(sheetId: string) {
    if (!unlockReason.trim()) { toast.error('Provide a reason for unlock'); return }
    setSaving(true)

    const { error } = await supabase
      .from('goal_sheets')
      .update({ status: 'draft' })
      .eq('id', sheetId)

    if (error) { toast.error('Could not unlock'); setSaving(false); return }

    await supabase.from('audit_log').insert({
      actor_id: adminId,
      action: 'goal_sheet_unlocked',
      entity_type: 'goal_sheets',
      entity_id: sheetId,
      reason: unlockReason,
    })

    setSheets(prev => prev.filter(s => s.id !== sheetId))
    setUnlockingGoal(null)
    setUnlockReason('')
    toast.success('Goal sheet unlocked for editing')
    setSaving(false)
  }

  async function pushSharedGoal() {
    if (!pushingGoal || selectedRecipients.size === 0) {
      toast.error('Select at least one employee')
      return
    }
    setPushing(true)
    try {
      const res = await fetch('/api/shared-goals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ goalId: pushingGoal.goal.id, recipientIds: Array.from(selectedRecipients) }),
      })
      const data = await res.json()
      if (data.error) { toast.error(data.error); return }
      toast.success(`Pushed to ${data.created} employee${data.created !== 1 ? 's' : ''}${data.skipped > 0 ? ` (${data.skipped} skipped)` : ''}`)
      setPushingGoal(null)
      setSelectedRecipients(new Set())
    } catch {
      toast.error('Could not push goal')
    } finally {
      setPushing(false)
    }
  }

  function toggleRecipient(id: string) {
    setSelectedRecipients(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Goal Management</h1>
      <p className="mb-6 text-sm text-slate-500">
        View approved goal sheets, unlock them for editing, or push goals to other employees as shared goals.
      </p>

      {sheets.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
          <p className="text-sm text-slate-500">No approved goal sheets found</p>
        </div>
      ) : (
        <div className="space-y-4">
          {sheets.map(sheet => (
            <div key={sheet.id} className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="font-medium text-slate-900">{sheet.employee?.name}</p>
                  <p className="text-xs text-slate-500">{sheet.employee?.department}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-100 text-green-700 border-green-300" variant="outline">
                    <Lock className="mr-1 h-3 w-3" />
                    Approved
                  </Badge>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setUnlockingGoal({ id: sheet.id } as Goal)}
                    className="text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  >
                    <Unlock className="mr-1 h-3 w-3" />
                    Unlock
                  </Button>
                </div>
              </div>
              {changeRequests.filter(r => r.entity_id === sheet.id).slice(0, 1).map((r, i) => (
                <div key={i} className="mb-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  <span className="font-medium">Change requested: </span>{r.reason}
                </div>
              ))}
              <div className="space-y-1">
                {(sheet.goals ?? []).map(goal => (
                  <div key={goal.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <div className="min-w-0 flex-1">
                      <span className="text-slate-700">{goal.title}</span>
                      {goal.is_shared && (
                        <Badge variant="outline" className="ml-2 text-xs text-purple-600 border-purple-300">Shared</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-500">{goal.weightage}%</span>
                      {!goal.is_shared && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => { setPushingGoal({ goal, sheetOwner: sheet.employee?.id ?? '' }); setSelectedRecipients(new Set()) }}
                          className="h-6 px-2 text-xs text-slate-500 hover:text-blue-600"
                        >
                          <Share2 className="mr-1 h-3 w-3" />
                          Push
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Unlock Dialog */}
      <Dialog open={!!unlockingGoal} onOpenChange={() => { setUnlockingGoal(null); setUnlockReason('') }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Unlock goal sheet</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <p className="text-sm text-slate-600">
              This will revert the sheet to Draft status. The employee will need to resubmit and get manager re-approval. This action is logged.
            </p>
            <div>
              <label className="text-sm font-medium text-slate-700">Reason for unlock</label>
              <Textarea
                value={unlockReason}
                onChange={(e) => setUnlockReason(e.target.value)}
                placeholder="e.g. Employee requested changes due to role shift"
                rows={3}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setUnlockingGoal(null)}>Cancel</Button>
            <Button
              onClick={() => unlockingGoal && unlockGoalSheet(unlockingGoal.id)}
              disabled={saving}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {saving ? 'Unlocking...' : 'Unlock sheet'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Push Shared Goal Dialog */}
      <Dialog open={!!pushingGoal} onOpenChange={() => { setPushingGoal(null); setSelectedRecipients(new Set()) }}>
        <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Push goal to team members</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-3">
            {pushingGoal && (
              <div className="rounded-lg bg-slate-50 p-3 text-sm">
                <p className="font-medium text-slate-900">{pushingGoal.goal.title}</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Target: {pushingGoal.goal.target_value ?? pushingGoal.goal.target_date ?? 'Not set'} · {pushingGoal.goal.weightage}% weight
                </p>
                <p className="text-xs text-slate-400 mt-1">Recipients can only adjust the weightage. Title and target are locked.</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-slate-700 mb-2">Select employees to receive this goal:</p>
              <div className="space-y-1 max-h-60 overflow-y-auto">
                {employees
                  .filter(e => e.id !== pushingGoal?.sheetOwner && e.role === 'employee')
                  .map(e => (
                    <label key={e.id} className="flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-slate-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedRecipients.has(e.id)}
                        onChange={() => toggleRecipient(e.id)}
                        className="h-4 w-4 rounded border-slate-300 text-orange-500"
                      />
                      <div>
                        <span className="text-sm text-slate-800">{e.name}</span>
                        <span className="ml-2 text-xs text-slate-400">{e.department}</span>
                      </div>
                    </label>
                  ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setPushingGoal(null); setSelectedRecipients(new Set()) }}>Cancel</Button>
            <Button onClick={pushSharedGoal} disabled={pushing || selectedRecipients.size === 0} className="bg-orange-500 hover:bg-orange-600">
              {pushing ? 'Pushing...' : `Push to ${selectedRecipients.size} employee${selectedRecipients.size !== 1 ? 's' : ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
