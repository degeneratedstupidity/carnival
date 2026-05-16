'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'

interface Props {
  managerId: string
  employeeId: string
  cycleId: string
  quarter: string
  initialComment: string
}

export function ManagerCheckinDetailClient({ managerId, employeeId, cycleId, quarter, initialComment }: Props) {
  const supabase = createClient()
  const [comment, setComment] = useState(initialComment)
  const [saving, setSaving] = useState(false)

  async function saveComment() {
    if (!comment.trim()) return
    setSaving(true)
    const { error } = await supabase
      .from('manager_checkin_sessions')
      .upsert(
        { manager_id: managerId, employee_id: employeeId, cycle_id: cycleId, quarter, session_comment: comment },
        { onConflict: 'manager_id,employee_id,cycle_id,quarter' }
      )
    if (error) {
      toast.error('Could not save comment')
    } else {
      toast.success('Comment saved')
    }
    setSaving(false)
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4">
      <p className="mb-2 text-sm font-medium text-slate-700">Session notes</p>
      <p className="mb-3 text-xs text-slate-500">
        Add observations or coaching notes for this check-in session. Visible to you only.
      </p>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="e.g. Revenue is on track, needs to accelerate training hours in Q3."
        rows={3}
        className="mb-3"
      />
      <Button
        onClick={saveComment}
        disabled={saving || !comment.trim()}
        className="bg-orange-500 hover:bg-orange-600"
      >
        {saving ? 'Saving...' : 'Save notes'}
      </Button>
    </div>
  )
}
