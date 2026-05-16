import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { CheckinClient } from './CheckinClient'

export default async function CheckinPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: activeCycle }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', user.id).single(),
    supabase.from('goal_cycles').select('*').eq('is_active', true).single(),
  ])

  if (!profile || profile.role !== 'employee') redirect('/')

  if (!activeCycle) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-sm text-slate-500">No active goal cycle found.</p>
      </div>
    )
  }

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select('*')
    .eq('employee_id', user.id)
    .eq('cycle_id', activeCycle.id)
    .single()

  if (!sheet || sheet.status !== 'approved') {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-2">
        <p className="text-sm font-medium text-slate-700">Goals not yet approved</p>
        <p className="text-xs text-slate-500">Check-in is available after your manager approves your goals.</p>
      </div>
    )
  }

  const { data: goals } = await supabase
    .from('goals')
    .select('*, thrust_area:thrust_areas(*)')
    .eq('sheet_id', sheet.id)
    .order('position')

  const activeQuarter = activeCycle.phase as string
  const validQuarters = ['q1', 'q2', 'q3', 'q4']
  const quarter = validQuarters.includes(activeQuarter) ? activeQuarter : 'q1'

  const { data: checkIns } = await supabase
    .from('check_ins')
    .select('*')
    .in('goal_id', (goals ?? []).map(g => g.id))
    .eq('quarter', quarter)

  return (
    <CheckinClient
      profile={profile}
      activeCycle={activeCycle}
      goals={goals ?? []}
      initialCheckIns={checkIns ?? []}
      currentQuarter={quarter}
    />
  )
}
