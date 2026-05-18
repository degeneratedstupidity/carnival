import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'
import Link from 'next/link'
import { CheckCircle2, Clock, AlertCircle, FileText } from 'lucide-react'

const STATUS_META: Record<string, { label: string; color: string; bg: string }> = {
  draft:     { label: 'Draft',     color: '#8888a3', bg: 'rgba(136,136,163,0.1)' },
  submitted: { label: 'Submitted', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)' },
  approved:  { label: 'Approved',  color: '#10b981', bg: 'rgba(16,185,129,0.1)' },
  returned:  { label: 'Returned',  color: '#f43f5e', bg: 'rgba(244,63,94,0.1)' },
}

export default async function ApprovalsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'manager') redirect('/')

  const { data: team } = await supabase.from('profiles').select('*').eq('manager_id', user.id).order('name')
  const { data: activeCycle } = await supabase.from('goal_cycles').select('*').eq('is_active', true).single()

  const teamIds = (team ?? []).map(t => t.id)
  const sheets = teamIds.length > 0 && activeCycle
    ? (await supabase.from('goal_sheets').select('*').in('employee_id', teamIds).eq('cycle_id', activeCycle.id)).data ?? []
    : []

  const sheetByEmployee = new Map(sheets.map(s => [s.employee_id, s]))

  const submitted = sheets.filter(s => s.status === 'submitted').length
  const approved  = sheets.filter(s => s.status === 'approved').length
  const returned  = sheets.filter(s => s.status === 'returned').length

  return (
    <AppShell role="manager" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-4xl space-y-8 p-6">

        {/* ── Header ── */}
        <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.25em]" style={{ color: '#3b82f6' }}>
            Manager View
          </p>
          <h1
            className="text-5xl font-extrabold uppercase leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
          >
            Team<br />Approvals
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            {activeCycle ? activeCycle.name : 'No active cycle'}
          </p>
        </div>

        {/* ── Stats row ── */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Submitted', value: submitted, color: '#3b82f6', bg: 'rgba(59,130,246,0.08)', icon: Clock },
            { label: 'Approved',  value: approved,  color: '#10b981', bg: 'rgba(16,185,129,0.08)', icon: CheckCircle2 },
            { label: 'Returned',  value: returned,  color: '#f43f5e', bg: 'rgba(244,63,94,0.08)',  icon: AlertCircle },
          ].map(stat => {
            const Icon = stat.icon
            return (
              <div
                key={stat.label}
                className="rounded-2xl border p-4 text-center"
                style={{ background: stat.bg, borderColor: stat.color + '30' }}
              >
                <Icon className="mx-auto mb-1 h-5 w-5" style={{ color: stat.color }} />
                <p className="text-2xl font-extrabold" style={{ color: stat.color, fontFamily: 'var(--font-syne)' }}>
                  {stat.value}
                </p>
                <p className="mt-0.5 text-[10px] font-bold uppercase tracking-widest" style={{ color: stat.color }}>
                  {stat.label}
                </p>
              </div>
            )
          })}
        </div>

        {/* ── Team list ── */}
        {(team ?? []).length === 0 ? (
          <div
            className="flex flex-col items-center justify-center gap-4 rounded-3xl border-2 border-dashed py-20 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <FileText className="h-10 w-10" style={{ color: 'var(--muted-foreground)' }} />
            <div>
              <p className="font-bold" style={{ color: 'var(--foreground)' }}>No direct reports yet</p>
              <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>
                Contact admin to assign team members
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {(team ?? []).map(member => {
              const memberSheet = sheetByEmployee.get(member.id)
              const status = memberSheet?.status ?? 'none'
              const meta = STATUS_META[status] ?? { label: 'No Goals', color: '#8888a3', bg: 'rgba(136,136,163,0.05)' }
              const isClickable = !!memberSheet && memberSheet.status === 'submitted'

              return (
                <Link
                  key={member.id}
                  href={memberSheet ? `/manager/approvals/${memberSheet.id}` : '#'}
                  className={!memberSheet ? 'pointer-events-none' : ''}
                >
                  <div
                    className="group flex items-center justify-between rounded-2xl border p-5 transition-all"
                    style={{
                      background: 'var(--card)',
                      borderColor: isClickable ? 'rgba(59,130,246,0.3)' : 'var(--border)',
                    }}
                  >
                    {/* Avatar + info */}
                    <div className="flex items-center gap-4">
                      <div
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-sm font-black text-white"
                        style={{ background: meta.color }}
                      >
                        {member.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p
                          className="font-black uppercase tracking-tight"
                          style={{ color: 'var(--foreground)', fontFamily: 'var(--font-syne)' }}
                        >
                          {member.name}
                        </p>
                        <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>
                          {member.department ?? member.email}
                        </p>
                        {memberSheet?.submitted_at && (
                          <p className="mt-0.5 text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
                            Submitted {new Date(memberSheet.submitted_at).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center gap-3">
                      <span
                        className="rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest"
                        style={{ background: meta.bg, color: meta.color }}
                      >
                        {memberSheet ? status : 'No Goals'}
                      </span>
                      {isClickable && (
                        <div
                          className="rounded-xl px-3 py-2 text-[10px] font-black uppercase tracking-widest transition-all"
                          style={{ background: '#3b82f6', color: 'white' }}
                        >
                          Review →
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </div>
    </AppShell>
  )
}
