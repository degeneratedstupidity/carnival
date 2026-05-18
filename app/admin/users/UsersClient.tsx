'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { Profile, Role } from '@/types'

const ROLE_COLORS: Record<Role, string> = {
  employee: '#f97316',
  manager: '#3b82f6',
  admin: '#8b5cf6',
}

interface UsersClientProps {
  profiles: Profile[]
  managers: Profile[]
}

export function UsersClient({ profiles, managers }: UsersClientProps) {
  const supabase = createClient()
  const [users, setUsers] = useState(profiles)

  async function updateManager(userId: string, managerId: string) {
    const { error } = await supabase
      .from('profiles')
      .update({ manager_id: managerId === 'none' ? null : managerId })
      .eq('id', userId)
    if (error) { toast.error('Could not update'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, manager_id: managerId === 'none' ? null : managerId } : u))
    toast.success('Manager updated')
  }

  async function updateDepartment(userId: string, department: string) {
    const { error } = await supabase.from('profiles').update({ department }).eq('id', userId)
    if (error) { toast.error('Could not update'); return }
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, department } : u))
  }

  return (
    <div className="mx-auto max-w-5xl space-y-8 p-6">
      <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#7c3aed' }}>Admin Panel</p>
        <h1 className="text-5xl font-extrabold uppercase leading-none tracking-tight" style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}>Users</h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>Manage roles, departments, and manager assignments</p>
      </div>
      <div className="overflow-x-auto rounded-2xl border" style={{ background: 'var(--card)', borderColor: 'var(--border)' }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--muted)' }}>
              {['Name', 'Role', 'Department', 'Reports To'].map(h => (
                <th key={h} className="px-5 py-3.5 text-left text-[10px] font-black uppercase tracking-widest" style={{ color: 'var(--muted-foreground)' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {users.map(u => (
              <tr key={u.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td className="px-5 py-4">
                  <p className="font-black uppercase tracking-tight" style={{ color: 'var(--foreground)', fontFamily: 'var(--font-syne)' }}>{u.name}</p>
                  <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>{u.email}</p>
                </td>
                <td className="px-5 py-4">
                  <span className="rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-widest" style={{ background: ROLE_COLORS[u.role] + '18', color: ROLE_COLORS[u.role] }}>
                    {u.role}
                  </span>
                </td>
                <td className="px-5 py-4">
                  <input
                    className="rounded-xl border px-3 py-1.5 text-xs"
                    style={{ background: 'var(--muted)', borderColor: 'var(--border)', color: 'var(--foreground)', width: '7rem' }}
                    defaultValue={u.department ?? ''}
                    onBlur={(e) => { if (e.target.value !== u.department) updateDepartment(u.id, e.target.value) }}
                  />
                </td>
                <td className="px-5 py-4">
                  {u.role === 'employee' ? (
                    <Select value={u.manager_id ?? 'none'} onValueChange={(v) => v && updateManager(u.id, v)}>
                      <SelectTrigger className="h-8 w-44 text-xs">
                        <span className="truncate">{u.manager_id ? (managers.find(m => m.id === u.manager_id)?.name ?? 'Unknown') : 'No manager'}</span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {managers.map(m => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--muted-foreground)' }}>—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
