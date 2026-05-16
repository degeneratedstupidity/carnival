import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { GoalsClient } from './GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const [{ data: profile }, { data: thrustAreas }, { data: templates }, { data: activeCycle }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', user.id).single(),
      supabase.from('thrust_areas').select('*').order('name'),
      supabase.from('goal_templates').select('*, thrust_area:thrust_areas(*)').order('title'),
      supabase.from('goal_cycles').select('*').eq('is_active', true).single(),
    ])

  if (!profile || profile.role !== 'employee') redirect('/')

  let sheet = null
  let goals: unknown[] = []

  if (activeCycle) {
    const { data: existingSheet } = await supabase
      .from('goal_sheets')
      .select('*')
      .eq('employee_id', user.id)
      .eq('cycle_id', activeCycle.id)
      .single()

    sheet = existingSheet

    if (sheet) {
      const { data: goalData } = await supabase
        .from('goals')
        .select('*, thrust_area:thrust_areas(*)')
        .eq('sheet_id', sheet.id)
        .order('position')
      goals = goalData ?? []
    }
  }

  return (
    <GoalsClient
      profile={profile}
      activeCycle={activeCycle}
      sheet={sheet}
      initialGoals={goals}
      thrustAreas={thrustAreas ?? []}
      templates={templates ?? []}
    />
  )
}
