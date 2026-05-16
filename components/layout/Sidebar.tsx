'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Role } from '@/types'

const employeeNav = [
  { label: 'My Goals', href: '/employee/goals' },
  { label: 'Check-in', href: '/employee/checkin' },
]

const managerNav = [
  { label: 'Approvals', href: '/manager/approvals' },
  { label: 'Check-ins', href: '/manager/checkin' },
]

const adminNav = [
  { label: 'Dashboard', href: '/admin/dashboard' },
  { label: 'Analytics', href: '/admin/analytics' },
  { label: 'Reports', href: '/admin/reports' },
  { label: 'Cycles', href: '/admin/cycles' },
  { label: 'Users', href: '/admin/users' },
  { label: 'Goals', href: '/admin/goals' },
  { label: 'Thrust Areas', href: '/admin/thrust-areas' },
  { label: 'Escalations', href: '/admin/escalations' },
  { label: 'Audit Log', href: '/admin/audit' },
]

const navByRole: Record<Role, typeof employeeNav> = {
  employee: employeeNav,
  manager: managerNav,
  admin: adminNav,
}

interface SidebarProps {
  role: Role
  name: string
  department?: string | null
}

export function Sidebar({ role, name, department }: SidebarProps) {
  const pathname = usePathname()
  const nav = navByRole[role]

  return (
    <div className="flex h-full w-56 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white">
          C
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Carnival</p>
          <p className="text-xs text-slate-500">Goal Tracker</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
            {role === 'employee' ? 'My Workspace' : role === 'manager' ? 'Manager View' : 'Admin Panel'}
          </p>
          <ul className="space-y-0.5">
            {nav.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center rounded-lg px-3 py-2 text-sm transition-colors',
                    pathname === item.href || pathname.startsWith(item.href + '/')
                      ? 'bg-orange-50 font-medium text-orange-700'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4">
        <p className="text-sm font-medium text-slate-900 truncate">{name}</p>
        <p className="text-xs text-slate-500">{department ?? role}</p>
        <span className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize"
          style={{
            background: role === 'admin' ? '#f1f5f9' : role === 'manager' ? '#eff6ff' : '#fff7ed',
            color: role === 'admin' ? '#475569' : role === 'manager' ? '#1d4ed8' : '#c2410c',
          }}>
          {role}
        </span>
      </div>
    </div>
  )
}
