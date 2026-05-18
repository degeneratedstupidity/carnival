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
    <div className="mx-auto max-w-5xl p-6">
      <h1 className="mb-6 text-xl font-bold text-slate-900">Users</h1>
      <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full text-sm">
          <thead className="border-b border-slate-100 bg-slate-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Name</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Role</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Department</th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600">Reports to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50">
                <td className="px-4 py-3">
                  <p className="font-medium text-slate-900">{u.name}</p>
                  <p className="text-xs text-slate-400">{u.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge
                    variant="outline"
                    className="capitalize text-xs"
                    style={{ borderColor: ROLE_COLORS[u.role], color: ROLE_COLORS[u.role] }}
                  >
                    {u.role}
                  </Badge>
                </td>
                <td className="px-4 py-3">
                  <input
                    className="rounded border border-slate-200 px-2 py-1 text-xs w-28"
                    defaultValue={u.department ?? ''}
                    onBlur={(e) => { if (e.target.value !== u.department) updateDepartment(u.id, e.target.value) }}
                  />
                </td>
                <td className="px-4 py-3">
                  {u.role === 'employee' ? (
                    <Select
                      value={u.manager_id ?? 'none'}
                      onValueChange={(v) => v && updateManager(u.id, v)}
                    >
                      <SelectTrigger className="h-7 w-40 text-xs">
                        <span className="truncate">
                          {u.manager_id
                            ? (managers.find(m => m.id === u.manager_id)?.name ?? 'Unknown')
                            : 'No manager'}
                        </span>
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No manager</SelectItem>
                        {managers.map(m => (
                          <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="text-xs text-slate-400">—</span>
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
