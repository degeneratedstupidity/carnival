'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { MessageSquare, Save } from 'lucide-react'

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
      toast.success('Session notes saved')
    }
    setSaving(false)
  }

  return (
    <div
      className="mt-6 rounded-2xl border p-5"
      style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageSquare className="h-4 w-4" style={{ color: '#3b82f6' }} />
        <p className="text-xs font-black uppercase tracking-widest" style={{ color: 'var(--foreground)' }}>
          Session Notes
        </p>
      </div>
      <p className="mb-4 text-xs" style={{ color: 'var(--muted-foreground)' }}>
        Add observations or coaching notes for this check-in. Visible to managers only.
      </p>
      <Textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="e.g. Revenue is on track, needs to accelerate training hours in Q3."
        rows={3}
        className="mb-4"
      />
      <Button
        onClick={saveComment}
        disabled={saving || !comment.trim()}
        className="h-10 rounded-xl text-xs font-black uppercase tracking-widest"
        style={{ background: '#3b82f6', color: 'white' }}
      >
        <Save className="mr-2 h-3.5 w-3.5" />
        {saving ? 'Saving...' : 'Save Notes'}
      </Button>
    </div>
  )
}
