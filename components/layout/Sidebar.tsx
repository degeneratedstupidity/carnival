'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Role } from '@/types'
import { ThemeToggle } from './ThemeToggle'
import {
  Target, CheckCircle2, Star, Users, PieChart, ShieldAlert,
  LayoutDashboard, Settings, BarChart2, FileText, Layers,
  ClipboardList, Shield, LogOut
} from 'lucide-react'

const employeeNav = [
  { label: 'My Goals', href: '/employee/goals', icon: Target },
  { label: 'Check-in', href: '/employee/checkin', icon: CheckCircle2 },
]

const managerNav = [
  { label: 'Approvals', href: '/manager/approvals', icon: Star },
  { label: 'Check-ins', href: '/manager/checkin', icon: CheckCircle2 },
]

const adminNav = [
  { label: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard },
  { label: 'Analytics', href: '/admin/analytics', icon: PieChart },
  { label: 'Reports', href: '/admin/reports', icon: FileText },
  { label: 'Cycles', href: '/admin/cycles', icon: BarChart2 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Goals', href: '/admin/goals', icon: Target },
  { label: 'Thrust Areas', href: '/admin/thrust-areas', icon: Layers },
  { label: 'Escalations', href: '/admin/escalations', icon: ShieldAlert },
  { label: 'Audit Log', href: '/admin/audit', icon: ClipboardList },
]

const navByRole: Record<Role, typeof employeeNav> = {
  employee: employeeNav,
  manager: managerNav,
  admin: adminNav,
}

const roleMeta: Record<Role, { label: string; accentColor: string; accentBg: string }> = {
  employee: { label: 'Employee', accentColor: '#fbbf24', accentBg: 'rgba(245,158,11,0.12)' },
  manager:  { label: 'Manager',  accentColor: '#93c5fd', accentBg: 'rgba(59,130,246,0.12)' },
  admin:    { label: 'Admin',    accentColor: '#c4b5fd', accentBg: 'rgba(124,58,237,0.12)' },
}

interface SidebarProps {
  role: Role
  name: string
  department?: string | null
}

export function Sidebar({ role, name, department }: SidebarProps) {
  const pathname = usePathname()
  const nav = navByRole[role]
  const meta = roleMeta[role]

  return (
    <div
      className="flex h-full w-56 shrink-0 flex-col border-r"
      style={{
        borderColor: 'var(--border)',
        background: 'var(--sidebar)',
        color: 'var(--sidebar-foreground)',
      }}
    >
      {/* Brand */}
      <div
        className="flex items-center gap-2.5 px-5 py-4 border-b"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <div
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm font-extrabold text-[#09090f]"
          style={{
            background: '#f59e0b',
            boxShadow: '0 0 14px rgba(245,158,11,0.4)',
            fontFamily: 'var(--font-syne)',
          }}
        >
          C
        </div>
        <div>
          <p
            className="text-sm font-bold tracking-wide"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--sidebar-foreground)' }}
          >
            Carnival
          </p>
          <p className="text-xs" style={{ color: 'var(--muted-foreground)' }}>Goal Tracker</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto p-3">
        <p
          className="mb-3 px-2 text-[9px] font-black uppercase tracking-[0.25em]"
          style={{ color: 'var(--muted-foreground)' }}
        >
          {role === 'employee' ? 'My Workspace' : role === 'manager' ? 'Manager View' : 'Admin Panel'}
        </p>
        <ul className="space-y-0.5">
          {nav.map((item) => {
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            const Icon = item.icon
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    'flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-bold uppercase tracking-widest transition-all duration-150',
                  )}
                  style={
                    active
                      ? {
                          background: 'rgba(245,158,11,0.12)',
                          color: '#f59e0b',
                        }
                      : {
                          color: 'var(--muted-foreground)',
                        }
                  }
                  onMouseEnter={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                      e.currentTarget.style.color = 'var(--foreground)'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!active) {
                      e.currentTarget.style.background = ''
                      e.currentTarget.style.color = 'var(--muted-foreground)'
                    }
                  }}
                >
                  <Icon
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: active ? '#f59e0b' : 'currentColor' }}
                  />
                  <span>{item.label}</span>
                  {active && (
                    <span
                      className="ml-auto h-1.5 w-1.5 rounded-full"
                      style={{ background: '#f59e0b' }}
                    />
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {/* User footer */}
      <div
        className="border-t p-4"
        style={{ borderColor: 'var(--sidebar-border)' }}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p
              className="truncate text-xs font-black uppercase tracking-tight"
              style={{ color: 'var(--sidebar-foreground)', fontFamily: 'var(--font-syne)' }}
            >
              {name}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--muted-foreground)' }}>
              {department ?? role}
            </p>
            <span
              className="mt-1 inline-block rounded px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
              style={{ background: meta.accentBg, color: meta.accentColor }}
            >
              {meta.label}
            </span>
          </div>
          <ThemeToggle />
        </div>
      </div>
    </div>
  )
}
