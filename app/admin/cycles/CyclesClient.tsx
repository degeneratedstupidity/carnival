'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { GoalCycle, CyclePhase } from '@/types'
import { useRouter } from 'next/navigation'

const PHASES: CyclePhase[] = ['goal_setting', 'q1', 'q2', 'q3', 'q4']

interface CyclesClientProps {
  initialCycles: GoalCycle[]
}

export function CyclesClient({ initialCycles }: CyclesClientProps) {
  const supabase = createClient()
  const router = useRouter()
  const [cycles, setCycles] = useState(initialCycles)
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ name: '', year: new Date().getFullYear(), phase: 'goal_setting' as CyclePhase, opens_at: '', closes_at: '' })
  const [saving, setSaving] = useState(false)

  async function createCycle() {
    setSaving(true)
    const { data, error } = await supabase.from('goal_cycles').insert({ ...form, is_active: false }).select().single()
    if (error) { toast.error('Could not create cycle'); setSaving(false); return }
    setCycles(prev => [data, ...prev])
    setOpen(false)
    toast.success('Cycle created')
    setSaving(false)
  }

  async function toggleActive(cycle: GoalCycle) {
    // Deactivate all, then activate this one
    await supabase.from('goal_cycles').update({ is_active: false }).neq('id', 'none')
    const { error } = await supabase.from('goal_cycles').update({ is_active: !cycle.is_active }).eq('id', cycle.id)
    if (error) { toast.error('Could not update cycle'); return }
    setCycles(prev => prev.map(c => ({ ...c, is_active: c.id === cycle.id ? !cycle.is_active : false })))
    toast.success(cycle.is_active ? 'Cycle deactivated' : 'Cycle set as active')
    router.refresh()
  }

  async function updatePhase(cycle: GoalCycle, phase: CyclePhase) {
    const { error } = await supabase.from('goal_cycles').update({ phase }).eq('id', cycle.id)
    if (error) { toast.error('Could not update phase'); return }
    setCycles(prev => prev.map(c => c.id === cycle.id ? { ...c, phase } : c))
    toast.success('Phase updated')
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-900">Goal Cycles</h1>
        <Button onClick={() => setOpen(true)} className="bg-orange-500 hover:bg-orange-600">New cycle</Button>
      </div>

      <div className="space-y-3">
        {cycles.map(cycle => (
          <div key={cycle.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-4">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-slate-900">{cycle.name}</p>
                {cycle.is_active && <Badge className="bg-green-100 text-green-700 border-green-300" variant="outline">Active</Badge>}
              </div>
              <p className="text-xs text-slate-500">
                {cycle.year} • {cycle.opens_at} → {cycle.closes_at ?? 'ongoing'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Select value={cycle.phase} onValueChange={(v) => updatePhase(cycle, v as CyclePhase)}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PHASES.map(p => <SelectItem key={p} value={p}>{p.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => toggleActive(cycle)} className="text-xs">
                {cycle.is_active ? 'Deactivate' : 'Set active'}
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>New goal cycle</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div><Label>Name</Label><Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="FY 2027 — Goal Setting" /></div>
            <div><Label>Year</Label><Input type="number" value={form.year} onChange={e => setForm(p => ({ ...p, year: parseInt(e.target.value) }))} /></div>
            <div><Label>Opens on</Label><Input type="date" value={form.opens_at} onChange={e => setForm(p => ({ ...p, opens_at: e.target.value }))} /></div>
            <div><Label>Closes on (optional)</Label><Input type="date" value={form.closes_at} onChange={e => setForm(p => ({ ...p, closes_at: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={createCycle} disabled={saving} className="bg-orange-500 hover:bg-orange-600">{saving ? 'Creating...' : 'Create cycle'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
