import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { AdminDashboardClient } from './AdminDashboardClient'

export default async function AdminDashboard() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()

  const [
    { count: totalEmployees },
    { count: submitted },
    { count: approved },
    { data: escalations },
    { data: allProfiles },
    { data: allSheets },
    { data: recentAudit },
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee'),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('escalations').select('*').eq('status', 'pending').limit(5),
    supabase.from('profiles').select('id, name, department').eq('role', 'employee'),
    activeCycle
      ? supabase.from('goal_sheets').select('employee_id, status').eq('cycle_id', activeCycle.id)
      : Promise.resolve({ data: [] }),
    supabase.from('audit_log').select('*, actor:profiles(name)').order('created_at', { ascending: false }).limit(5),
  ])

  const sheetMap = new Map((allSheets ?? []).map(s => [s.employee_id, s.status]))
  const pending = (totalEmployees ?? 0) - (submitted ?? 0) - (approved ?? 0)
  const submissionRate = totalEmployees ? Math.round(((submitted ?? 0) + (approved ?? 0)) / (totalEmployees ?? 1) * 100) : 0
  const approvalRate   = (submitted ?? 0) + (approved ?? 0) > 0
    ? Math.round((approved ?? 0) / ((submitted ?? 0) + (approved ?? 0)) * 100)
    : 0

  const departments = [...new Set((allProfiles ?? []).map(p => p.department ?? 'General'))]
  const deptData = departments.map(dept => {
    const members = (allProfiles ?? []).filter(p => (p.department ?? 'General') === dept)
    const submittedCount = members.filter(m => ['submitted', 'approved'].includes(sheetMap.get(m.id) ?? '')).length
    const approvedCount  = members.filter(m => sheetMap.get(m.id) === 'approved').length
    return { name: dept, submitted: submittedCount, approved: approvedCount, total: members.length }
  })

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <AdminDashboardClient
        activeCycleName={activeCycle?.name ?? null}
        totalEmployees={totalEmployees ?? 0}
        submitted={submitted ?? 0}
        approved={approved ?? 0}
        pending={Math.max(0, pending)}
        submissionRate={submissionRate}
        approvalRate={approvalRate}
        escalations={escalations ?? []}
        deptData={deptData}
        recentAudit={(recentAudit ?? []).map(l => ({
          actor: (l.actor as { name?: string } | null)?.name ?? 'System',
          action: l.action,
          time: new Date(l.created_at).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' }),
        }))}
      />
    </AppShell>
  )
}
