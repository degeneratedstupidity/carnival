'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import { GoalCycle } from '@/types'

interface Employee {
  id: string
  name: string
  department: string | null
  manager_id: string | null
  manager: { name: string } | null
}

interface GoalRow {
  id: string
  title: string
  uom_type: string
  target_value: number | null
  weightage: number
  thrust_area: { name: string } | null
  sheet: { employee_id: string; cycle_id: string; status: string } | null
  check_ins: Array<{ quarter: string; actual_value: number | null; computed_score: number | null }>
}

interface Props {
  cycles: GoalCycle[]
  employees: Employee[]
  goals: GoalRow[]
}

export function ReportsClient({ cycles, employees, goals }: Props) {
  const [cycleId, setCycleId] = useState<string>(cycles.find(c => c.is_active)?.id ?? cycles[0]?.id ?? '')
  function handleCycleChange(v: string | null) { if (v) setCycleId(v) }
  const [loading, setLoading] = useState(false)

  async function exportExcel() {
    if (!cycleId) { toast.error('Select a cycle first'); return }
    setLoading(true)
    try {
      const { utils, writeFile } = await import('xlsx')

      const cycleGoals = goals.filter(g => g.sheet?.cycle_id === cycleId && g.sheet?.status !== 'draft')

      const rows = employees.flatMap(emp => {
        const empGoals = cycleGoals.filter(g => g.sheet?.employee_id === emp.id)
        if (!empGoals.length) return []
        return empGoals.map(g => {
          const ci = (q: string) => g.check_ins.find(c => c.quarter === q)
          return {
            Employee: emp.name,
            Department: emp.department ?? '',
            Manager: emp.manager?.name ?? '',
            'Thrust Area': g.thrust_area?.name ?? '',
            Goal: g.title,
            'UoM Type': g.uom_type,
            Target: g.target_value ?? '',
            Weightage: `${g.weightage}%`,
            'Q1 Actual': ci('q1')?.actual_value ?? '',
            'Q1 Score': ci('q1')?.computed_score != null ? `${Math.round(ci('q1')!.computed_score!)}%` : '',
            'Q2 Actual': ci('q2')?.actual_value ?? '',
            'Q2 Score': ci('q2')?.computed_score != null ? `${Math.round(ci('q2')!.computed_score!)}%` : '',
            'Q3 Actual': ci('q3')?.actual_value ?? '',
            'Q3 Score': ci('q3')?.computed_score != null ? `${Math.round(ci('q3')!.computed_score!)}%` : '',
            'Q4 Actual': ci('q4')?.actual_value ?? '',
            'Q4 Score': ci('q4')?.computed_score != null ? `${Math.round(ci('q4')!.computed_score!)}%` : '',
          }
        })
      })

      if (!rows.length) { toast.error('No data for the selected cycle'); setLoading(false); return }

      const ws = utils.json_to_sheet(rows)
      const wb = utils.book_new()
      utils.book_append_sheet(wb, ws, 'Goals')
      const cycleName = cycles.find(c => c.id === cycleId)?.name ?? 'export'
      writeFile(wb, `carnival-goals-${cycleName.replace(/\s+/g, '-').toLowerCase()}.xlsx`)
      toast.success('Excel file downloaded')
    } catch {
      toast.error('Export failed')
    }
    setLoading(false)
  }

  const selectedCycle = cycles.find(c => c.id === cycleId)
  const cycleGoalCount = goals.filter(g => g.sheet?.cycle_id === cycleId && g.sheet.status !== 'draft').length

  return (
    <div className="mx-auto max-w-4xl p-6">
      <h1 className="mb-2 text-xl font-bold text-slate-900">Reports</h1>
      <p className="mb-6 text-sm text-slate-500">
        Export goal and achievement data as a spreadsheet for any cycle.
      </p>

      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6">
        <div>
          <label className="text-sm font-medium text-slate-700">Select cycle</label>
          <Select value={cycleId} onValueChange={handleCycleChange}>
            <SelectTrigger className="mt-1 w-64">
              <span className="truncate text-sm">
                {cycles.find(c => c.id === cycleId)
                  ? `${cycles.find(c => c.id === cycleId)!.name}${cycles.find(c => c.id === cycleId)!.is_active ? ' (active)' : ''}`
                  : 'Choose a cycle'}
              </span>
            </SelectTrigger>
            <SelectContent>
              {cycles.map(c => (
                <SelectItem key={c.id} value={c.id}>
                  {c.name} {c.is_active ? '(active)' : ''}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedCycle && (
          <div className="rounded-lg bg-slate-50 border border-slate-100 p-4 text-sm text-slate-600">
            <p><span className="font-medium">Cycle:</span> {selectedCycle.name}</p>
            <p><span className="font-medium">Phase:</span> {selectedCycle.phase}</p>
            <p><span className="font-medium">Goals in export:</span> {cycleGoalCount} (submitted or approved sheets)</p>
          </div>
        )}

        <div className="border-t border-slate-100 pt-4">
          <p className="text-sm font-medium text-slate-700 mb-1">Achievement report</p>
          <p className="text-xs text-slate-500 mb-3">
            Downloads an .xlsx file with one row per goal. Includes employee info, thrust area, UoM, target, and Q1–Q4 actuals with computed scores.
          </p>
          <Button
            onClick={exportExcel}
            disabled={loading || !cycleId}
            className="bg-slate-900 hover:bg-slate-800"
          >
            {loading ? 'Generating...' : 'Export Excel (.xlsx)'}
          </Button>
        </div>
      </div>
    </div>
  )
}
