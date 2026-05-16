import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Ensure a goal sheet exists for the current user + active cycle, return its id
export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { cycleId } = await request.json()
  if (!cycleId) return NextResponse.json({ error: 'cycleId required' }, { status: 400 })

  // Upsert sheet
  const { data, error } = await supabase
    .from('goal_sheets')
    .upsert({ employee_id: user.id, cycle_id: cycleId, status: 'draft' }, { onConflict: 'employee_id,cycle_id', ignoreDuplicates: true })
    .select()
    .single()

  if (error) {
    // If upsert returns nothing (ignoreDuplicates=true and row existed), fetch it
    const { data: existing } = await supabase
      .from('goal_sheets')
      .select('id')
      .eq('employee_id', user.id)
      .eq('cycle_id', cycleId)
      .single()
    return NextResponse.json({ sheetId: existing?.id ?? null })
  }

  return NextResponse.json({ sheetId: data.id })
}

// Submit a goal sheet
export async function PATCH(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sheetId, status } = await request.json()
  if (!sheetId || !status) return NextResponse.json({ error: 'sheetId and status required' }, { status: 400 })

  const update: Record<string, unknown> = { status }
  if (status === 'submitted') update.submitted_at = new Date().toISOString()
  if (status === 'approved') update.approved_at = new Date().toISOString()

  const { error } = await supabase.from('goal_sheets').update(update).eq('id', sheetId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
