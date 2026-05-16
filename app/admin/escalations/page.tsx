import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import { EscalationsClient } from './EscalationsClient'

export default async function EscalationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: rules } = await supabase
    .from('escalation_rules')
    .select('*')
    .order('rule_type')

  const { data: escalations } = await supabase
    .from('escalations')
    .select('*, target_user:profiles(name, department), rule:escalation_rules(rule_type)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <EscalationsClient rules={rules ?? []} escalations={escalations ?? []} />
    </AppShell>
  )
}
