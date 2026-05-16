import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

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
  ] = await Promise.all([
    supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'employee'),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'submitted'),
    supabase.from('goal_sheets').select('*', { count: 'exact', head: true }).eq('status', 'approved'),
    supabase.from('escalations').select('*').eq('status', 'pending').limit(5),
    supabase.from('profiles').select('id, name, department').eq('role', 'employee'),
    activeCycle
      ? supabase.from('goal_sheets').select('employee_id, status').eq('cycle_id', activeCycle.id)
      : Promise.resolve({ data: [] }),
  ])

  const sheetMap = new Map((allSheets ?? []).map(s => [s.employee_id, s.status]))
  const pending = (totalEmployees ?? 0) - (submitted ?? 0) - (approved ?? 0)

  const metrics = [
    { label: 'Total employees', value: totalEmployees ?? 0, color: '#64748b' },
    { label: 'Sheets submitted', value: submitted ?? 0, color: '#3b82f6' },
    { label: 'Sheets approved', value: approved ?? 0, color: '#22c55e' },
    { label: 'Pending submission', value: Math.max(0, pending), color: '#f59e0b' },
  ]

  // Completion heatmap
  const departments = [...new Set((allProfiles ?? []).map(p => p.department ?? 'General'))]
  const heatmapData = departments.map(dept => {
    const members = (allProfiles ?? []).filter(p => (p.department ?? 'General') === dept)
    return {
      dept,
      members: members.map(m => ({
        name: m.name,
        status: sheetMap.get(m.id) ?? 'none',
      })),
    }
  })

  const statusColor: Record<string, string> = {
    approved: '#22c55e',
    submitted: '#3b82f6',
    returned: '#f59e0b',
    draft: '#94a3b8',
    none: '#e2e8f0',
  }

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-5xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Admin Dashboard</h1>
          <p className="text-sm text-slate-500">{activeCycle ? activeCycle.name : 'No active cycle'}</p>
        </div>

        {/* Metric cards */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {metrics.map(m => (
            <Card key={m.label}>
              <CardContent className="p-4">
                <p className="text-xs text-slate-500">{m.label}</p>
                <p className="mt-1 text-3xl font-bold" style={{ color: m.color }}>{m.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Completion heatmap */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-sm font-semibold">Goal Sheet Status by Department</CardTitle>
          </CardHeader>
          <CardContent>
            {heatmapData.length === 0 ? (
              <p className="text-sm text-slate-500">No employees found</p>
            ) : (
              <div className="space-y-4">
                {heatmapData.map(({ dept, members }) => (
                  <div key={dept}>
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">{dept}</p>
                    <div className="flex flex-wrap gap-2">
                      {members.map(m => (
                        <div
                          key={m.name}
                          className="flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold text-white"
                          style={{ background: statusColor[m.status] ?? '#e2e8f0' }}
                          title={`${m.name} — ${m.status}`}
                        >
                          {m.name.charAt(0)}
                        </div>
                      ))}
                    </div>
                    <div className="mt-1 flex gap-3 text-xs text-slate-400">
                      {['approved', 'submitted', 'returned', 'draft', 'none'].map(s => (
                        <span key={s} className="flex items-center gap-1">
                          <span className="h-2 w-2 rounded-full inline-block" style={{ background: statusColor[s] }} />
                          {s}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Escalation alerts */}
        {(escalations ?? []).length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-semibold text-amber-700">Pending escalations ({(escalations ?? []).length})</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {(escalations ?? []).map(e => (
                  <li key={e.id} className="text-sm text-slate-700">{e.message}</li>
                ))}
              </ul>
              <a href="/admin/escalations" className="mt-2 block text-xs text-orange-600 hover:underline">View all escalations</a>
            </CardContent>
          </Card>
        )}
      </div>
    </AppShell>
  )
}
