import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { sheetId, thrustAreaId, title, description, uomType, targetValue, targetDate, weightage, position } = body

  if (!sheetId || !title || !uomType || weightage == null) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const { data, error } = await supabase.from('goals').insert({
    sheet_id: sheetId,
    thrust_area_id: thrustAreaId || null,
    title,
    description: description || null,
    uom_type: uomType,
    target_value: targetValue ?? null,
    target_date: targetDate || null,
    weightage,
    position: position ?? 0,
  }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ goal: data })
}

export async function DELETE(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const goalId = searchParams.get('id')
  if (!goalId) return NextResponse.json({ error: 'Goal ID required' }, { status: 400 })

  const { error } = await supabase.from('goals').delete().eq('id', goalId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
