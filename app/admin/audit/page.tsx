import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/layout/AppShell'

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
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-6 text-xl font-bold text-slate-900">Audit Log</h1>

        {(logs ?? []).length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-12 text-center">
            <p className="text-sm text-slate-500">No audit entries yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">When</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Who</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Action</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Entity</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {(logs ?? []).map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-xs text-slate-500">
                      {new Date(log.created_at).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-700">
                      {(log.actor as { name?: string; email?: string } | null)?.name ?? 'System'}
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-mono text-slate-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.entity_type}</td>
                    <td className="px-4 py-3 text-xs text-slate-500">{log.reason ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppShell>
  )
}
