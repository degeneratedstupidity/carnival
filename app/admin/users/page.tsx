import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { UsersClient } from './UsersClient'

export default async function UsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: profiles } = await supabase.from('profiles').select('*').order('name')
  const managers = (profiles ?? []).filter(p => p.role === 'manager')

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <UsersClient profiles={profiles ?? []} managers={managers} />
    </AppShell>
  )
}
