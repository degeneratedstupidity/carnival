'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Role } from '@/types'
import { ThemeToggle } from './ThemeToggle'

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

  const roleBadgeStyle = {
    admin: { background: 'rgba(124,58,237,0.15)', color: '#a78bfa' },
    manager: { background: 'rgba(59,130,246,0.15)', color: '#93c5fd' },
    employee: { background: 'rgba(245,158,11,0.15)', color: '#fbbf24' },
  }[role]

  return (
    <div className="flex h-full w-56 flex-col border-r border-slate-200 bg-white dark:border-[#22222e] dark:bg-[#0d0d14]">
      <div className="flex items-center gap-2.5 border-b border-slate-100 px-4 py-4 dark:border-[#22222e]">
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-orange-500 text-sm font-bold text-white dark:shadow-[0_0_14px_rgba(245,158,11,0.4)]"
          style={{ fontFamily: 'var(--font-syne)' }}
        >
          C
        </div>
        <div>
          <p
            className="text-sm font-bold tracking-wide text-slate-900 dark:text-[#f0f0f6]"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            Carnival
          </p>
          <p className="text-xs text-slate-500 dark:text-[#8888a3]">Goal Tracker</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3">
        <div className="mb-4">
          <p className="mb-2 px-2 text-xs font-semibold uppercase tracking-wider text-slate-400 dark:text-[#5a5a72]">
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
                      ? 'bg-orange-50 font-medium text-orange-700 dark:bg-[rgba(245,158,11,0.12)] dark:text-[#fbbf24]'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-[#8888a3] dark:hover:bg-white/5 dark:hover:text-[#f0f0f6]'
                  )}
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      <div className="border-t border-slate-100 p-4 dark:border-[#22222e]">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-900 dark:text-[#f0f0f6]">{name}</p>
            <p className="text-xs text-slate-500 dark:text-[#8888a3]">{department ?? role}</p>
            <span
              className="mt-1 inline-block rounded px-1.5 py-0.5 text-xs font-medium capitalize"
              style={roleBadgeStyle}
            >
              {role}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
