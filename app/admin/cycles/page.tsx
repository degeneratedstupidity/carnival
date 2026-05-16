import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { CyclesClient } from './CyclesClient'

export default async function CyclesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: cycles } = await supabase.from('goal_cycles').select('*').order('year', { ascending: false }).order('phase')

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <CyclesClient initialCycles={cycles ?? []} />
    </AppShell>
  )
}
