import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import Link from 'next/link'

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
    ? (await supabase
        .from('goal_sheets')
        .select('*')
        .in('employee_id', teamIds)
        .eq('cycle_id', activeCycle.id)
        .eq('status', 'approved')).data ?? []
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
      <div className="mx-auto max-w-3xl p-6">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-slate-900">Team Check-ins</h1>
          <p className="text-sm text-slate-500">
            {activeCycle ? `${activeCycle.name} — ${quarter.toUpperCase()}` : 'No active cycle'}
          </p>
        </div>

        {approvedSheets.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No approved goal sheets found</p>
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

              return (
                <Link key={sheet.id} href={`/manager/checkin/${sheet.id}`}>
                  <Card className="transition-shadow hover:shadow-md">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-slate-900">{emp?.name}</p>
                          <p className="text-xs text-slate-500">{emp?.department}</p>
                          <div className="mt-2 flex items-center gap-2">
                            <Progress value={score} className="h-1.5 w-32" />
                            <span className="text-xs text-slate-500">{score}% avg score</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <Badge variant="outline" className="text-xs">
                            {checkedInCount}/{sheetGoals.length} goals updated
                          </Badge>
                        </div>
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
