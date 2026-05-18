'use client'

import { Sidebar } from './Sidebar'
import { DemoSwitcher } from './DemoSwitcher'
import { Role } from '@/types'

interface AppShellProps {
  role: Role
  name: string
  department?: string | null
  children: React.ReactNode
}

export function AppShell({ role, name, department, children }: AppShellProps) {
  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      <Sidebar role={role} name={name} department={department} />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
      <DemoSwitcher />
    </div>
  )
}
