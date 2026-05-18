import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ScoreRing } from '@/components/goals/ScoreRing'
import { ManagerCheckinDetailClient } from './ManagerCheckinDetailClient'
import Link from 'next/link'
import { ChevronLeft } from 'lucide-react'

const STATUS_COLOR: Record<string, string> = {
  completed:   '#10b981',
  on_track:    '#3b82f6',
  not_started: '#8888a3',
}

export default async function ManagerCheckinDetailPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: manager } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!manager || manager.role !== 'manager') redirect('/')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()
  const validQuarters = ['q1', 'q2', 'q3', 'q4']
  const activePhase = activeCycle?.phase ?? 'q1'
  const quarter = validQuarters.includes(activePhase) ? activePhase : 'q1'

  const { data: sheet } = await supabase.from('goal_sheets').select('id, employee_id, status').eq('id', sheetId).single()
  if (!sheet) redirect('/manager/checkin')

  const { data: employee } = await supabase.from('profiles').select('id, name, department, email').eq('id', sheet.employee_id).single()
  const { data: goals } = await supabase.from('goals').select('*, thrust_area:thrust_areas(*)').eq('sheet_id', sheetId).order('position')
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

  const rows = (goals ?? []).map(g => ({ ...g, checkIn: checkInMap.get(g.id) ?? null }))
  const avgScore = rows.length === 0 ? 0 : Math.round(rows.reduce((sum, r) => sum + (r.checkIn?.computed_score ?? 0), 0) / rows.length)

  return (
    <AppShell role="manager" name={manager.name} department={manager.department}>
      <div className="mx-auto max-w-4xl space-y-8 p-6">

        {/* ── Header ── */}
        <div>
          <Link
            href="/manager/checkin"
            className="mb-4 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest"
            style={{ color: 'var(--muted-foreground)' }}
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Team Check-ins
          </Link>
          <div className="flex flex-col gap-4 border-b pb-8 sm:flex-row sm:items-end sm:justify-between" style={{ borderColor: 'var(--border)' }}>
            <div>
              <h1
                className="text-4xl font-extrabold uppercase leading-none tracking-tight"
                style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
              >
                {employee?.name}
              </h1>
              <p className="mt-2 text-sm" style={{ color: 'var(--muted-foreground)' }}>
                {employee?.department ?? employee?.email} — {quarter.toUpperCase()} Check-in
              </p>
            </div>
            <div className="flex items-center gap-4">
              <ScoreRing score={avgScore} size={60} />
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>Avg Score</p>
              </div>
            </div>
          </div>
        </div>

        {/* ── Goals table ── */}
        {rows.length === 0 ? (
          <div className="flex items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center" style={{ borderColor: 'var(--border)' }}>
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No goals found for this sheet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                  {['Goal', 'Target', 'Actual', 'Score', 'Status'].map(h => (
                    <th
                      key={h}
                      className={`px-5 py-3.5 text-[10px] font-black uppercase tracking-widest ${h === 'Goal' ? 'text-left' : 'text-center'}`}
                      style={{ color: 'var(--muted-foreground)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(row => {
                  const score = row.checkIn?.computed_score ?? 0
                  const hasCheckin = row.checkIn !== null
                  const statusKey = row.checkIn?.progress_status ?? 'not_started'
                  const statusColor = STATUS_COLOR[statusKey] ?? '#8888a3'
                  return (
                    <tr key={row.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-4">
                        <p className="font-bold" style={{ color: 'var(--foreground)' }}>{row.title}</p>
                        {row.thrust_area && (
                          <span className="mt-1 inline-block rounded-full px-2 py-0.5 text-[10px] font-bold text-white" style={{ background: row.thrust_area.color }}>
                            {row.thrust_area.name}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
                        {row.uom_type === 'timeline' ? row.target_date ?? '—' : row.uom_type === 'zero' ? '0' : `${row.target_value ?? '—'}${row.uom_type.includes('percent') ? '%' : ''}`}
                      </td>
                      <td className="px-5 py-4 text-center text-sm" style={{ color: hasCheckin ? 'var(--foreground)' : 'var(--muted-foreground)' }}>
                        {!hasCheckin ? '—' : row.uom_type === 'timeline' ? row.checkIn?.actual_date ?? '—' : `${row.checkIn?.actual_value ?? '—'}${row.uom_type.includes('percent') ? '%' : ''}`}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-center"><ScoreRing score={score} size={44} /></div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest"
                          style={{ background: statusColor + '18', color: statusColor }}
                        >
                          {statusKey.replace('_', ' ')}
                        </span>
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
