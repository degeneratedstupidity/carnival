import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import Link from 'next/link'

const STATUS_COLOR: Record<string, string> = {
  draft: '#94a3b8',
  submitted: '#3b82f6',
  approved: '#22c55e',
  returned: '#ef4444',
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'manager') redirect('/')

  const { data: team } = await supabase
    .from('profiles')
    .select('*')
    .eq('manager_id', user.id)
    .order('name')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()

  const teamIds = (team ?? []).map(t => t.id)
  const sheets = teamIds.length > 0 && activeCycle
    ? (await supabase
        .from('goal_sheets')
        .select('*, employee:profiles(*)')
        .in('employee_id', teamIds)
        .eq('cycle_id', activeCycle.id)).data ?? []
    : []

  const sheetByEmployee = new Map(sheets.map(s => [s.employee_id, s]))

  return (
    <AppShell role="manager" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Team Goal Approvals</h1>
          <p className="text-sm text-slate-500">
            {activeCycle ? activeCycle.name : 'No active cycle'}
          </p>
        </div>

        {(team ?? []).length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No direct reports assigned yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {(team ?? []).map(member => {
              const memberSheet = sheetByEmployee.get(member.id)
              const status = memberSheet?.status ?? 'draft'
              const color = STATUS_COLOR[status] ?? '#94a3b8'

              return (
                <Link
                  key={member.id}
                  href={memberSheet ? `/manager/approvals/${memberSheet.id}` : '#'}
                  className={`block ${!memberSheet ? 'cursor-not-allowed opacity-60' : ''}`}
                >
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="flex items-center justify-between p-4">
                      <div>
                        <p className="font-medium text-slate-900">{member.name}</p>
                        <p className="text-xs text-slate-500">{member.department ?? member.email}</p>
                      </div>
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className="text-xs capitalize"
                          style={{ borderColor: color, color }}
                        >
                          {memberSheet ? status : 'No goals yet'}
                        </Badge>
                        {memberSheet?.submitted_at && (
                          <p className="mt-1 text-xs text-slate-400">
                            Submitted {new Date(memberSheet.submitted_at).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
