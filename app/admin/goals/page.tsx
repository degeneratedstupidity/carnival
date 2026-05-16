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

  const { data: sheets } = activeCycle
    ? await supabase
        .from('goal_sheets')
        .select('*, employee:profiles(*), goals(*, thrust_area:thrust_areas(*))')
        .eq('cycle_id', activeCycle.id)
        .eq('status', 'approved')
    : { data: [] }

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <AdminGoalsClient
        adminId={user.id}
        employees={employees ?? []}
        thrustAreas={thrustAreas ?? []}
        approvedSheets={sheets ?? []}
      />
    </AppShell>
  )
}
