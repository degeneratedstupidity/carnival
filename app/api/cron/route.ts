import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data: rules } = await supabase.from('escalation_rules').select('*').eq('is_active', true)
  if (!rules?.length) return NextResponse.json({ ok: true, created: 0 })

  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()
  if (!activeCycle) return NextResponse.json({ ok: true, created: 0, note: 'No active cycle' })

  const { data: employees } = await supabase.from('profiles').select('id, manager_id').eq('role', 'employee')
  const { data: managers } = await supabase.from('profiles').select('id').eq('role', 'manager')
  const { data: sheets } = await supabase.from('goal_sheets').select('id, employee_id, status, submitted_at').eq('cycle_id', activeCycle.id)
  const { data: checkins } = await supabase.from('check_ins').select('goal_id, quarter').eq('cycle_id', activeCycle.id)

  const nowMs = Date.now()
  const cycleOpens = new Date(activeCycle.opens_at).getTime()
  const daysSinceCycleOpen = Math.floor((nowMs - cycleOpens) / 86_400_000)

  let created = 0
  const escalationsToInsert: Array<{ rule_id: string; target_user_id: string; status: string; message: string }> = []

  for (const rule of rules) {
    if (rule.rule_type === 'submission_delay' && daysSinceCycleOpen > rule.threshold_days) {
      // Employees with no submitted/approved sheet
      const noSubmit = (employees ?? []).filter(e =>
        !sheets?.some(s => s.employee_id === e.id && ['submitted', 'approved'].includes(s.status))
      )
      for (const emp of noSubmit) {
        escalationsToInsert.push({
          rule_id: rule.id,
          target_user_id: emp.id,
          status: 'pending',
          message: `Goal sheet not submitted ${daysSinceCycleOpen} days after cycle opened.`,
        })
      }
    }

    if (rule.rule_type === 'approval_delay') {
      // Managers with pending sheets for >threshold_days since submission
      const submittedSheets = (sheets ?? []).filter(s => s.status === 'submitted' && s.submitted_at)
      for (const sheet of submittedSheets) {
        const daysSinceSubmit = Math.floor((nowMs - new Date(sheet.submitted_at!).getTime()) / 86_400_000)
        if (daysSinceSubmit > rule.threshold_days) {
          const emp = (employees ?? []).find(e => e.id === sheet.employee_id)
          const managerId = emp?.manager_id
          if (managerId) {
            escalationsToInsert.push({
              rule_id: rule.id,
              target_user_id: managerId,
              status: 'pending',
              message: `Goal sheet pending approval for ${daysSinceSubmit} days.`,
            })
          }
        }
      }
    }

    if (rule.rule_type === 'checkin_delay' && ['q1', 'q2', 'q3', 'q4'].includes(activeCycle.phase)) {
      const quarter = activeCycle.phase as string
      // Employees with approved sheets but no check-in for current quarter
      const approvedSheets = (sheets ?? []).filter(s => s.status === 'approved')
      for (const sheet of approvedSheets) {
        const { data: goals } = await supabase.from('goals').select('id').eq('sheet_id', sheet.id)
        const hasCheckin = (goals ?? []).some(g =>
          checkins?.some(c => c.goal_id === g.id && c.quarter === quarter)
        )
        if (!hasCheckin) {
          escalationsToInsert.push({
            rule_id: rule.id,
            target_user_id: sheet.employee_id,
            status: 'pending',
            message: `No ${quarter.toUpperCase()} check-in recorded yet.`,
          })
        }
      }
    }
  }

  if (escalationsToInsert.length > 0) {
    const { error } = await supabase.from('escalations').insert(escalationsToInsert)
    if (!error) created = escalationsToInsert.length
  }

  return NextResponse.json({ ok: true, created })
}
