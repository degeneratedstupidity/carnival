import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Badge } from '@/components/ui/badge'
import { ScoreRing } from '@/components/goals/ScoreRing'
import { ManagerCheckinDetailClient } from './ManagerCheckinDetailClient'

export default async function ManagerCheckinDetailPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: manager } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!manager || manager.role !== 'manager') redirect('/')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()
  const quarter = activeCycle?.phase ?? 'q1'

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select('id, employee_id, status')
    .eq('id', sheetId)
    .single()

  if (!sheet) redirect('/manager/checkin')

  const { data: employee } = await supabase
    .from('profiles')
    .select('id, name, department, email')
    .eq('id', sheet.employee_id)
    .single()

  const { data: goals } = await supabase
    .from('goals')
    .select('*, thrust_area:thrust_areas(*)')
    .eq('sheet_id', sheetId)
    .order('position')

  const goalIds = (goals ?? []).map(g => g.id)

  const { data: checkIns } = goalIds.length > 0
    ? await supabase.from('check_ins').select('*').in('goal_id', goalIds).eq('quarter', quarter)
    : { data: [] }

  const checkInMap = new Map((checkIns ?? []).map(ci => [ci.goal_id, ci]))

  const { data: session } = await supabase
    .from('manager_checkin_sessions')
    .select('session_comment')
    .eq('manager_id', user.id)
    .eq('employee_id', sheet.employee_id)
    .eq('cycle_id', activeCycle?.id ?? '')
    .eq('quarter', quarter)
    .maybeSingle()

  const rows = (goals ?? []).map(g => ({
    ...g,
    checkIn: checkInMap.get(g.id) ?? null,
  }))

  return (
    <AppShell role="manager" name={manager.name} department={manager.department}>
      <div className="mx-auto max-w-4xl p-6">
        <div className="mb-6">
          <p className="mb-1 text-xs text-slate-400">
            <a href="/manager/checkin" className="hover:underline">Team Check-ins</a> / {employee?.name}
          </p>
          <h1 className="text-xl font-bold text-slate-900">{employee?.name} — {quarter.toUpperCase()} Check-in</h1>
          <p className="text-sm text-slate-500">{employee?.department ?? employee?.email}</p>
        </div>

        {rows.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No goals found for this sheet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Goal</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Target</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-slate-600">Actual</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Score</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-slate-600">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rows.map(row => {
                  const score = row.checkIn?.computed_score ?? 0
                  const hasCheckin = row.checkIn !== null
                  return (
                    <tr key={row.id} className={hasCheckin ? '' : 'bg-slate-50/50'}>
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-slate-900">{row.title}</p>
                          {row.thrust_area && (
                            <span
                              className="mt-0.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium text-white"
                              style={{ background: row.thrust_area.color }}
                            >
                              {row.thrust_area.name}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {row.uom_type === 'timeline'
                          ? row.target_date ?? '—'
                          : row.uom_type === 'zero'
                          ? '0'
                          : `${row.target_value ?? '—'}${row.uom_type.includes('percent') ? '%' : ''}`}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        {!hasCheckin ? (
                          <span className="text-slate-400">Not entered</span>
                        ) : row.uom_type === 'timeline'
                          ? row.checkIn?.actual_date ?? '—'
                          : `${row.checkIn?.actual_value ?? '—'}${row.uom_type.includes('percent') ? '%' : ''}`}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <ScoreRing score={score} size={40} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-center">
                        {hasCheckin ? (
                          <Badge
                            variant="outline"
                            className="text-xs capitalize"
                            style={{
                              borderColor: row.checkIn?.progress_status === 'completed' ? '#22c55e' : row.checkIn?.progress_status === 'on_track' ? '#3b82f6' : '#94a3b8',
                              color: row.checkIn?.progress_status === 'completed' ? '#22c55e' : row.checkIn?.progress_status === 'on_track' ? '#3b82f6' : '#94a3b8',
                            }}
                          >
                            {(row.checkIn?.progress_status ?? 'not_started').replace('_', ' ')}
                          </Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not started</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        <ManagerCheckinDetailClient
          managerId={manager.id}
          employeeId={sheet.employee_id}
          cycleId={activeCycle?.id ?? ''}
          quarter={quarter}
          initialComment={session?.session_comment ?? ''}
        />
      </div>
    </AppShell>
  )
}
