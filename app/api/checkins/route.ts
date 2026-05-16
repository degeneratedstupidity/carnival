import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { computeScore } from '@/lib/scoring'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { goalId, cycleId, quarter, actualValue, actualDate, progressStatus, goal } = body

  if (!goalId || !cycleId || !quarter) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const computedScore = goal
    ? computeScore(
        goal.uom_type,
        goal.target_value,
        actualValue,
        goal.target_date ?? null,
        actualDate ?? null,
      )
    : null

  const { data, error } = await supabase.from('check_ins').upsert({
    goal_id: goalId,
    cycle_id: cycleId,
    quarter,
    actual_value: actualValue ?? null,
    actual_date: actualDate || null,
    progress_status: progressStatus ?? 'not_started',
    computed_score: computedScore,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'goal_id,quarter' }).select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ checkin: data, computedScore })
}
