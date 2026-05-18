import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendEmail, emailGoalSubmitted, emailGoalApproved, emailGoalReturned } from '@/lib/email'

type EmailType = 'submitted' | 'approved' | 'returned'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { type, sheetId, reason } = await request.json() as { type: EmailType; sheetId: string; reason?: string }
  if (!type || !sheetId) return NextResponse.json({ error: 'type and sheetId required' }, { status: 400 })

  // Fetch sheet + employee profile
  const { data: sheet } = await supabase.from('goal_sheets').select('employee_id').eq('id', sheetId).single()
  if (!sheet) return NextResponse.json({ error: 'Sheet not found' }, { status: 404 })

  const { data: employee } = await supabase.from('profiles').select('name, email, manager_id').eq('id', sheet.employee_id).single()
  if (!employee) return NextResponse.json({ ok: true })

  if (type === 'submitted' && employee.manager_id) {
    const { data: manager } = await supabase.from('profiles').select('email').eq('id', employee.manager_id).single()
    if (manager) {
      const [to, subject, html] = emailGoalSubmitted({ employeeName: employee.name, managerEmail: manager.email })
      await sendEmail(to, subject, html)
    }
  } else if (type === 'approved') {
    const [to, subject, html] = emailGoalApproved({ employeeName: employee.name, employeeEmail: employee.email })
    await sendEmail(to, subject, html)
  } else if (type === 'returned') {
    const [to, subject, html] = emailGoalReturned({ employeeName: employee.name, employeeEmail: employee.email, reason: reason ?? '' })
    await sendEmail(to, subject, html)
  }

  return NextResponse.json({ ok: true })
}
