import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { goalId, recipientIds } = await request.json() as { goalId: string; recipientIds: string[] }
  if (!goalId || !recipientIds?.length) {
    return NextResponse.json({ error: 'goalId and recipientIds are required' }, { status: 400 })
  }

  // Fetch source goal
  const { data: sourceGoal, error: goalErr } = await supabase
    .from('goals')
    .select('*')
    .eq('id', goalId)
    .single()
  if (goalErr || !sourceGoal) return NextResponse.json({ error: 'Goal not found' }, { status: 404 })

  // Fetch active cycle
  const { data: cycle } = await supabase.from('goal_cycles').select('id').eq('is_active', true).single()
  if (!cycle) return NextResponse.json({ error: 'No active cycle' }, { status: 400 })

  let created = 0
  let skipped = 0

  for (const recipientId of recipientIds) {
    // Get or create draft goal_sheet for recipient
    let sheetId: string

    const { data: existing } = await supabase
      .from('goal_sheets')
      .select('id, status')
      .eq('employee_id', recipientId)
      .eq('cycle_id', cycle.id)
      .single()

    if (existing) {
      if (existing.status === 'approved') { skipped++; continue } // can't push to locked sheet
      sheetId = existing.id
    } else {
      const { data: newSheet, error: sheetErr } = await supabase
        .from('goal_sheets')
        .insert({ employee_id: recipientId, cycle_id: cycle.id, status: 'draft' })
        .select('id')
        .single()
      if (sheetErr || !newSheet) { skipped++; continue }
      sheetId = newSheet.id
    }

    // Check if already pushed
    const { data: dupe } = await supabase
      .from('goals')
      .select('id')
      .eq('sheet_id', sheetId)
      .eq('shared_from_goal_id', goalId)
      .single()
    if (dupe) { skipped++; continue }

    // Insert shared goal
    const { error: insertErr } = await supabase.from('goals').insert({
      sheet_id: sheetId,
      thrust_area_id: sourceGoal.thrust_area_id,
      title: sourceGoal.title,
      description: sourceGoal.description,
      uom_type: sourceGoal.uom_type,
      target_value: sourceGoal.target_value,
      target_date: sourceGoal.target_date,
      weightage: 10,
      is_shared: true,
      shared_from_goal_id: goalId,
      title_readonly: true,
      target_readonly: true,
      position: 99,
    })

    if (insertErr) { skipped++; continue }
    created++
  }

  // Log push action
  await supabase.from('audit_log').insert({
    actor_id: user.id,
    action: 'shared_goal_pushed',
    entity_type: 'goals',
    entity_id: goalId,
    reason: `Pushed to ${created} employee(s)`,
  })

  return NextResponse.json({ created, skipped })
}
