import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AnalyticsClient } from './AnalyticsClient'

export default async function AnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  // Fetch all data separately to avoid complex nested join type issues
  const { data: allProfiles } = await supabase.from('profiles').select('id, name, department, role, manager_id')
  const { data: allGoals } = await supabase.from('goals').select('id, sheet_id, uom_type, thrust_area_id')
  const { data: allSheets } = await supabase.from('goal_sheets').select('id, employee_id, cycle_id, status')
  const { data: allCheckins } = await supabase.from('check_ins').select('goal_id, quarter, computed_score')
  const { data: allThrustAreas } = await supabase.from('thrust_areas').select('id, name')
  const { data: managers } = await supabase.from('profiles').select('id, name').eq('role', 'manager')
  const { data: employees } = await supabase.from('profiles').select('id, manager_id').eq('role', 'employee')

  // Pre-process: attach department to each check-in via goal→sheet→employee
  type CheckinData = { quarter: string; computed_score: number | null; department: string | null }
  type GoalDistData = { uom_type: string; thrust_area_name: string | null }

  const sheetMap = new Map((allSheets ?? []).map(s => [s.id, s]))
  const goalMap = new Map((allGoals ?? []).map(g => [g.id, g]))
  const profileMap = new Map((allProfiles ?? []).map(p => [p.id, p]))
  const thrustAreaMap = new Map((allThrustAreas ?? []).map(t => [t.id, t]))

  const checkins: CheckinData[] = (allCheckins ?? []).map(ci => {
    const goal = goalMap.get(ci.goal_id)
    const sheet = goal ? sheetMap.get(goal.sheet_id) : null
    const emp = sheet ? profileMap.get(sheet.employee_id) : null
    return { quarter: ci.quarter, computed_score: ci.computed_score, department: emp?.department ?? null }
  })

  const goals: GoalDistData[] = (allGoals ?? []).map(g => ({
    uom_type: g.uom_type,
    thrust_area_name: g.thrust_area_id ? thrustAreaMap.get(g.thrust_area_id)?.name ?? null : null,
  }))

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <AnalyticsClient
        checkins={checkins}
        goals={goals}
        managers={managers ?? []}
        employees={employees ?? []}
        sheets={allSheets ?? []}
      />
    </AppShell>
  )
}
