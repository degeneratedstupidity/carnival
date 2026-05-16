import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ApprovalClient } from './ApprovalClient'

export default async function ApprovalPage({ params }: { params: Promise<{ sheetId: string }> }) {
  const { sheetId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: manager } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!manager || manager.role !== 'manager') redirect('/')

  const { data: sheet } = await supabase
    .from('goal_sheets')
    .select('*')
    .eq('id', sheetId)
    .single()

  if (!sheet) redirect('/manager/approvals')

  const { data: employee } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', sheet.employee_id)
    .single()

  const { data: goals } = await supabase
    .from('goals')
    .select('*, thrust_area:thrust_areas(*)')
    .eq('sheet_id', sheetId)
    .order('position')

  return (
    <ApprovalClient
      manager={manager}
      sheet={sheet}
      employee={employee ?? null}
      initialGoals={goals ?? []}
    />
  )
}
