import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AdminGoalsClient } from './AdminGoalsClient'

export default async function AdminGoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()
  const { data: employees } = await supabase.from('profiles').select('*').eq('role', 'employee').order('name')
  const { data: thrustAreas } = await supabase.from('thrust_areas').select('*').order('name')

  const { data: rawSheets } = activeCycle
    ? await supabase
        .from('goal_sheets')
        .select('id, employee_id, cycle_id, status, goals(*, thrust_area:thrust_areas(*))')
        .eq('cycle_id', activeCycle.id)
        .eq('status', 'approved')
    : { data: [] }

  const employeeMap = new Map((employees ?? []).map(e => [e.id, e]))
  const approvedSheets = (rawSheets ?? []).map(s => ({
    ...s,
    employee: employeeMap.get(s.employee_id) ?? null,
  }))

  const sheetIds = approvedSheets.map(s => s.id)
  const { data: changeRequests } = sheetIds.length > 0
    ? await supabase
        .from('audit_log')
        .select('entity_id, reason, created_at')
        .eq('action', 'change_requested')
        .in('entity_id', sheetIds)
        .order('created_at', { ascending: false })
    : { data: [] }

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <AdminGoalsClient
        adminId={user.id}
        employees={employees ?? []}
        thrustAreas={thrustAreas ?? []}
        approvedSheets={approvedSheets}
        changeRequests={changeRequests ?? []}
      />
    </AppShell>
  )
}
