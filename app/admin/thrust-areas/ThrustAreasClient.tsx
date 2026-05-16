'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { toast } from 'sonner'
import { ThrustArea, GoalTemplate } from '@/types'
import { Plus, Trash2 } from 'lucide-react'

const UOM_TYPES = ['min_numeric', 'max_numeric', 'min_percent', 'max_percent', 'timeline', 'zero']
const UOM_LABELS: Record<string, string> = {
  min_numeric: 'Min Numeric', max_numeric: 'Max Numeric',
  min_percent: 'Min %', max_percent: 'Max %',
  timeline: 'Timeline', zero: 'Zero-based',
}

interface TemplateWithArea extends Omit<GoalTemplate, 'thrust_area'> {
  thrust_area: { name: string } | null
}

interface Props {
  adminId: string
  thrustAreas: ThrustArea[]
  templates: TemplateWithArea[]
}

export function ThrustAreasClient({ adminId, thrustAreas: initial, templates: initialTemplates }: Props) {
  const supabase = createClient()
  const [areas, setAreas] = useState(initial)
  const [templates, setTemplates] = useState(initialTemplates)

  // New thrust area form
  const [showAreaForm, setShowAreaForm] = useState(false)
  const [areaName, setAreaName] = useState('')
  const [areaDesc, setAreaDesc] = useState('')
  const [areaColor, setAreaColor] = useState('#3b82f6')
  const [savingArea, setSavingArea] = useState(false)

  // New template form
  const [showTemplateForm, setShowTemplateForm] = useState(false)
  const [tTitle, setTTitle] = useState('')
  const [tDesc, setTDesc] = useState('')
  const [tUom, setTUom] = useState('max_numeric')
  const [tWeight, setTWeight] = useState(20)
  const [tAreaId, setTAreaId] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  async function createArea() {
    if (!areaName.trim()) { toast.error('Name is required'); return }
    setSavingArea(true)
    const { data, error } = await supabase.from('thrust_areas').insert({ name: areaName.trim(), description: areaDesc.trim() || null, color: areaColor }).select().single()
    if (error) { toast.error('Could not create'); setSavingArea(false); return }
    setAreas(prev => [...prev, data])
    setAreaName(''); setAreaDesc(''); setAreaColor('#3b82f6'); setShowAreaForm(false)
    toast.success('Thrust area created')
    setSavingArea(false)
  }

  async function deleteArea(id: string) {
    const { error } = await supabase.from('thrust_areas').delete().eq('id', id)
    if (error) { toast.error('Could not delete — it may have goals attached'); return }
    setAreas(prev => prev.filter(a => a.id !== id))
    setTemplates(prev => prev.filter(t => t.thrust_area_id !== id))
    toast.success('Thrust area deleted')
  }

  async function createTemplate() {
    if (!tTitle.trim() || !tAreaId) { toast.error('Title and thrust area are required'); return }
    setSavingTemplate(true)
    const { data, error } = await supabase.from('goal_templates').insert({
      title: tTitle.trim(),
      description: tDesc.trim() || null,
      uom_type: tUom,
      suggested_weightage: tWeight,
      thrust_area_id: tAreaId,
      created_by: adminId,
    }).select('*, thrust_area:thrust_areas(name)').single()
    if (error) { toast.error('Could not create template'); setSavingTemplate(false); return }
    setTemplates(prev => [...prev, data])
    setTTitle(''); setTDesc(''); setTUom('max_numeric'); setTWeight(20); setTAreaId(''); setShowTemplateForm(false)
    toast.success('Template created')
    setSavingTemplate(false)
  }

  async function deleteTemplate(id: string) {
    const { error } = await supabase.from('goal_templates').delete().eq('id', id)
    if (error) { toast.error('Could not delete template'); return }
    setTemplates(prev => prev.filter(t => t.id !== id))
    toast.success('Template deleted')
  }

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-8">
      <h1 className="text-xl font-bold text-slate-900">Thrust Areas & Templates</h1>

      {/* Thrust areas */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Thrust areas</h2>
          <Button size="sm" variant="outline" onClick={() => setShowAreaForm(true)} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />Add area
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {areas.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">No thrust areas yet. Add one to get started.</p>
          )}
          {areas.map(a => (
            <div key={a.id} className="px-4 py-3 flex items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="h-3 w-3 rounded-full shrink-0" style={{ backgroundColor: a.color ?? '#94a3b8' }} />
                <div>
                  <p className="text-sm font-medium text-slate-900">{a.name}</p>
                  {a.description && <p className="text-xs text-slate-500">{a.description}</p>}
                </div>
              </div>
              <button
                onClick={() => deleteArea(a.id)}
                className="text-slate-300 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Templates */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-700">Goal templates</h2>
          <Button size="sm" variant="outline" onClick={() => setShowTemplateForm(true)} className="text-xs">
            <Plus className="h-3 w-3 mr-1" />Add template
          </Button>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100">
          {templates.length === 0 && (
            <p className="px-4 py-6 text-sm text-slate-500 text-center">No templates yet.</p>
          )}
          {templates.map(t => (
            <div key={t.id} className="px-4 py-3 flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-900">{t.title}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-xs px-1.5 py-0">{t.thrust_area?.name}</Badge>
                  <span className="text-xs text-slate-400">{UOM_LABELS[t.uom_type] ?? t.uom_type}</span>
                  <span className="text-xs text-slate-400">{t.suggested_weightage}%</span>
                </div>
                {t.description && <p className="text-xs text-slate-500 mt-1">{t.description}</p>}
              </div>
              <button
                onClick={() => deleteTemplate(t.id)}
                className="text-slate-300 hover:text-red-400 transition-colors mt-0.5"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Create area dialog */}
      <Dialog open={showAreaForm} onOpenChange={setShowAreaForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New thrust area</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Name</label>
              <Input value={areaName} onChange={e => setAreaName(e.target.value)} className="mt-1" placeholder="e.g. Revenue Growth" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description (optional)</label>
              <Textarea value={areaDesc} onChange={e => setAreaDesc(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Color</label>
              <div className="flex items-center gap-2 mt-1">
                <input type="color" value={areaColor} onChange={e => setAreaColor(e.target.value)} className="h-8 w-10 rounded border border-slate-200 cursor-pointer" />
                <span className="text-xs text-slate-500">{areaColor}</span>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAreaForm(false)}>Cancel</Button>
            <Button onClick={createArea} disabled={savingArea} className="bg-slate-900 hover:bg-slate-800">
              {savingArea ? 'Creating...' : 'Create area'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create template dialog */}
      <Dialog open={showTemplateForm} onOpenChange={setShowTemplateForm}>
        <DialogContent>
          <DialogHeader><DialogTitle>New goal template</DialogTitle></DialogHeader>
          <div className="space-y-3 py-2">
            <div>
              <label className="text-sm font-medium text-slate-700">Thrust area</label>
              <Select value={tAreaId} onValueChange={(v) => { if (v) setTAreaId(v) }}>
                <SelectTrigger className="mt-1"><SelectValue placeholder="Select area" /></SelectTrigger>
                <SelectContent>
                  {areas.map(a => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Goal title</label>
              <Input value={tTitle} onChange={e => setTTitle(e.target.value)} className="mt-1" placeholder="e.g. Increase quarterly revenue" />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-700">Description (optional)</label>
              <Textarea value={tDesc} onChange={e => setTDesc(e.target.value)} className="mt-1" rows={2} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-medium text-slate-700">UoM type</label>
                <Select value={tUom} onValueChange={(v) => { if (v) setTUom(v) }}>
                  <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {UOM_TYPES.map(u => <SelectItem key={u} value={u}>{UOM_LABELS[u]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700">Suggested weightage (%)</label>
                <Input type="number" min={10} max={100} value={tWeight} onChange={e => setTWeight(parseInt(e.target.value) || 10)} className="mt-1" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowTemplateForm(false)}>Cancel</Button>
            <Button onClick={createTemplate} disabled={savingTemplate} className="bg-slate-900 hover:bg-slate-800">
              {savingTemplate ? 'Creating...' : 'Create template'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
