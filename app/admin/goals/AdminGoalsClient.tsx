'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Profile, ThrustArea, Goal } from '@/types'
import { Lock, Unlock } from 'lucide-react'

interface AdminGoalsClientProps {
  adminId: string
  employees: Profile[]
  thrustAreas: ThrustArea[]
  approvedSheets: Array<{
    id: string
    employee: Profile
    goals: Goal[]
  }>
}

export function AdminGoalsClient({ adminId, approvedSheets }: AdminGoalsClientProps) {
  const supabase = createClient()
  const [unlockingGoal, setUnlockingGoal] = useState<Goal | null>(null)
  const [unlockReason, setUnlockReason] = useState('')
  const [saving, setSaving] = useState(false)
  const [sheets, setSheets] = useState(approvedSheets)

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

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Goal Management</h1>
      <p className="mb-6 text-sm text-slate-500">
        View approved goal sheets and unlock them for editing if needed. All unlocks are logged.
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
              <div className="space-y-1">
                {(sheet.goals ?? []).map(goal => (
                  <div key={goal.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-700">{goal.title}</span>
                    <span className="text-xs text-slate-500">{goal.weightage}%</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

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
    </div>
  )
}
