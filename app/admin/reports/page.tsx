import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ReportsClient } from './ReportsClient'

export default async function ReportsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: cycles } = await supabase.from('goal_cycles').select('*').order('year', { ascending: false })

  // Fetch flat data separately to avoid nested join array type issues
  const { data: rawEmployees } = await supabase.from('profiles').select('id, name, department, manager_id').eq('role', 'employee').order('name')
  const { data: allProfiles } = await supabase.from('profiles').select('id, name')
  const { data: rawGoals } = await supabase.from('goals').select('id, title, uom_type, target_value, weightage, sheet_id, thrust_area_id')
  const { data: rawSheets } = await supabase.from('goal_sheets').select('id, employee_id, cycle_id, status')
  const { data: rawCheckins } = await supabase.from('check_ins').select('goal_id, quarter, actual_value, computed_score')
  const { data: rawThrustAreas } = await supabase.from('thrust_areas').select('id, name')

  // Build lookup maps
  const profileNameMap = new Map((allProfiles ?? []).map(p => [p.id, p.name as string]))
  const sheetMap = new Map((rawSheets ?? []).map(s => [s.id, s]))
  const thrustAreaMap = new Map((rawThrustAreas ?? []).map(t => [t.id, t.name as string]))

  const employees = (rawEmployees ?? []).map(e => ({
    id: e.id as string,
    name: e.name as string,
    department: e.department as string | null,
    manager_id: e.manager_id as string | null,
    manager: e.manager_id ? { name: profileNameMap.get(e.manager_id) ?? '' } : null,
  }))

  const goals = (rawGoals ?? []).map(g => ({
    id: g.id as string,
    title: g.title as string,
    uom_type: g.uom_type as string,
    target_value: g.target_value as number | null,
    weightage: g.weightage as number,
    thrust_area: g.thrust_area_id ? { name: thrustAreaMap.get(g.thrust_area_id) ?? '' } : null,
    sheet: g.sheet_id ? sheetMap.get(g.sheet_id) ?? null : null,
    check_ins: (rawCheckins ?? []).filter(c => c.goal_id === g.id).map(c => ({
      quarter: c.quarter as string,
      actual_value: c.actual_value as number | null,
      computed_score: c.computed_score as number | null,
    })),
  }))

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <ReportsClient
        cycles={cycles ?? []}
        employees={employees}
        goals={goals}
      />
    </AppShell>
  )
}
