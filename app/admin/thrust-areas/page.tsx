import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { ThrustAreasClient } from './ThrustAreasClient'

export default async function ThrustAreasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: thrustAreas } = await supabase.from('thrust_areas').select('*').order('name')
  const { data: templates } = await supabase
    .from('goal_templates')
    .select('*, thrust_area:thrust_areas(name)')
    .order('title')

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <ThrustAreasClient
        adminId={user.id}
        thrustAreas={thrustAreas ?? []}
        templates={templates ?? []}
      />
    </AppShell>
  )
}
