import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ScoreRing } from '@/components/goals/ScoreRing'
import Link from 'next/link'
import { ChevronRight, Users } from 'lucide-react'

export default async function ManagerCheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: manager } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!manager || manager.role !== 'manager') redirect('/')

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()
  const { data: team } = await supabase.from('profiles').select('*').eq('manager_id', user.id).order('name')
  const teamIds = (team ?? []).map(t => t.id)
  const validQuarters = ['q1', 'q2', 'q3', 'q4']
  const activePhase = activeCycle?.phase ?? 'q1'
  const quarter = validQuarters.includes(activePhase) ? activePhase : 'q1'

  const approvedSheets = teamIds.length > 0 && activeCycle
    ? (await supabase.from('goal_sheets').select('*').in('employee_id', teamIds).eq('cycle_id', activeCycle.id).eq('status', 'approved')).data ?? []
    : []

  const teamMap = new Map((team ?? []).map(t => [t.id, t]))
  const sheetIds = approvedSheets.map(s => s.id)
  const allGoals = sheetIds.length > 0
    ? (await supabase.from('goals').select('*, check_ins(*)').in('sheet_id', sheetIds)).data ?? []
    : []

  const goalsBySheet = new Map<string, typeof allGoals>()
  for (const goal of allGoals) {
    const s = goalsBySheet.get(goal.sheet_id) ?? []
    s.push(goal)
    goalsBySheet.set(goal.sheet_id, s)
  }

  function avgScore(goals: typeof allGoals): number {
    const scored = goals.filter(g => g.check_ins?.some((ci: { quarter: string; computed_score: number }) => ci.quarter === quarter && ci.computed_score !== null))
    if (scored.length === 0) return 0
    const total = scored.reduce((sum, g) => {
      const ci = g.check_ins?.find((c: { quarter: string }) => c.quarter === quarter)
      return sum + (ci?.computed_score ?? 0)
    }, 0)
    return Math.round(total / scored.length)
  }

  return (
    <AppShell role="manager" name={manager.name} department={manager.department}>
      <div className="mx-auto max-w-3xl space-y-8 p-6">

        {/* ── Header ── */}
        <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: '#3b82f6' }}>Manager View</p>
          <h1
            className="text-5xl font-extrabold uppercase leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
          >
            Team<br />Check-ins
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {activeCycle ? `${activeCycle.name} — ${quarter.toUpperCase()}` : 'No active cycle'}
          </p>
        </div>

        {/* ── Team cards ── */}
        {approvedSheets.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed py-20 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <Users className="h-10 w-10" style={{ color: 'var(--muted-foreground)' }} />
            <div>
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>No approved goal sheets</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Check-in data appears once your team's goals are approved
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {approvedSheets.map(sheet => {
              const emp = teamMap.get(sheet.employee_id)
              const sheetGoals = goalsBySheet.get(sheet.id) ?? []
              const score = avgScore(sheetGoals)
              const checkedInCount = sheetGoals.filter(g =>
                g.check_ins?.some((ci: { quarter: string; computed_score: number | null }) => ci.quarter === quarter && ci.computed_score !== null)
              ).length
              const scoreColor = score >= 80 ? '#10b981' : score >= 50 ? '#f59e0b' : '#f43f5e'

              return (
                <Link key={sheet.id} href={`/manager/checkin/${sheet.id}`}>
                  <div
                    className="flex items-center justify-between gap-6 rounded-2xl border p-5 transition-all hover:border-[rgba(59,130,246,0.4)]"
                    style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                        style={{ background: '#3b82f6' }}
                      >
                        {emp?.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="font-black uppercase tracking-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-syne)' }}>
                          {emp?.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{emp?.department}</p>
                        <div className="mt-1.5 h-1.5 w-32 overflow-hidden rounded-full" style={{ background: 'var(--muted)' }}>
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.min(score, 100)}%`, background: scoreColor }}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="text-[10px] font-bold uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                          {checkedInCount}/{sheetGoals.length} goals
                        </p>
                        <ScoreRing score={score} size={44} />
                      </div>
                      <ChevronRight className="h-4 w-4" style={{ color: 'var(--muted-foreground)' }} />
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
