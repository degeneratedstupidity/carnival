import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

const ACTION_COLORS: Record<string, string> = {
  sheet_approved:         '#10b981',
  sheet_returned:         '#f43f5e',
  goal_edited_by_manager: '#3b82f6',
  change_requested:       '#f59e0b',
}

export default async function AuditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/')

  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile || profile.role !== 'admin') redirect('/')

  const { data: logs } = await supabase
    .from('audit_log')
    .select('*, actor:profiles(name, email)')
    .order('created_at', { ascending: false })
    .limit(100)

  return (
    <AppShell role="admin" name={profile.name} department={profile.department}>
      <div className="mx-auto max-w-5xl space-y-8 p-6">

        {/* ── Header ── */}
        <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
          <p className="mb-2 text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#7c3aed' }}>Admin Panel</p>
          <h1
            className="text-5xl font-extrabold uppercase leading-none tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
          >
            Audit Log
          </h1>
          <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
            Full trail of all actions — last 100 entries
          </p>
        </div>

        {(logs ?? []).length === 0 ? (
          <div
            className="flex items-center justify-center rounded-3xl border-2 border-dashed py-20 text-center"
            style={{ borderColor: 'var(--border)' }}
          >
            <p className="text-sm" style={{ color: 'var(--muted-foreground)' }}>No audit entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
                  {['When', 'Who', 'Action', 'Entity', 'Reason'].map(h => (
                    <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(logs ?? []).map(log => {
                  const actionColor = ACTION_COLORS[log.action] ?? 'var(--muted-foreground)'
                  return (
                    <tr key={log.id} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td className="px-5 py-3.5 text-xs whitespace-nowrap" style={{ color: 'var(--muted-foreground)' }}>
                        {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                      </td>
                      <td className="px-5 py-3.5 text-xs font-bold" style={{ color: 'var(--foreground)' }}>
                        {(log.actor as { name?: string; email?: string } | null)?.name ?? 'System'}
                      </td>
                      <td className="px-5 py-3.5">
                        <span
                          className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide"
                          style={{ background: actionColor + '18', color: actionColor }}
                        >
                          {log.action.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {log.entity_type}
                      </td>
                      <td className="px-5 py-3.5 text-xs" style={{ color: 'var(--muted-foreground)' }}>
                        {log.reason ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
