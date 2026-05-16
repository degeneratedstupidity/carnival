'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ROLES = [
  { label: 'Employee', role: 'employee', path: '/employee/goals' },
  { label: 'Manager', role: 'manager', path: '/manager/approvals' },
  { label: 'Admin', role: 'admin', path: '/admin/dashboard' },
]

export function DemoSwitcher() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  async function switchRole(email: string, path: string) {
    setLoading(true)
    const supabase = createClient()
    await supabase.auth.signInWithPassword({ email, password: 'Demo@2026!' })
    router.push(path)
    router.refresh()
    setLoading(false)
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      <div className="flex items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-3 py-1 text-xs font-medium text-amber-800 shadow">
        Demo Mode
      </div>
      <div className="flex gap-1 rounded-xl border border-slate-200 bg-white p-1 shadow-lg">
        {ROLES.map(({ label, role, path }) => (
          <button
            key={role}
            disabled={loading}
            onClick={() => switchRole(`${role}@carnival.demo`, path)}
            className="rounded-lg px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  )
}
