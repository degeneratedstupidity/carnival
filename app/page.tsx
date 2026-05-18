'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Role } from '@/types'
import { ThemeToggle } from '@/components/layout/ThemeToggle'

const ROLE_PATHS: Record<Role, string> = {
  employee: '/employee/goals',
  manager: '/manager/approvals',
  admin: '/admin/dashboard',
}

const DEMO_ROLES: { role: Role; label: string; color: string; bg: string }[] = [
  { role: 'employee', label: 'Employee', color: '#fbbf24', bg: 'rgba(245,158,11,0.12)' },
  { role: 'manager', label: 'Manager', color: '#93c5fd', bg: 'rgba(59,130,246,0.12)' },
  { role: 'admin', label: 'Admin', color: '#c4b5fd', bg: 'rgba(124,58,237,0.12)' },
]

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    if (!profile) {
      toast.error('Profile not found. Contact your admin.')
      setLoading(false)
      return
    }

    router.push(ROLE_PATHS[profile.role as Role])
    router.refresh()
  }

  async function loginAsDemo(role: Role) {
    setLoading(true)
    const supabase = createClient()
    const { data, error } = await supabase.auth.signInWithPassword({
      email: `${role}@carnival.demo`,
      password: 'Demo@2026!',
    })

    if (error) {
      toast.error('Demo login failed. Run the seed script first.')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    router.push(ROLE_PATHS[(profile?.role ?? role) as Role])
    router.refresh()
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#faf9f6] dark:bg-[#09090f]">
      {/* Background blobs */}
      <div
        className="pointer-events-none absolute left-1/4 top-1/4 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full opacity-20 blur-3xl"
        style={{ background: 'radial-gradient(circle, #f59e0b 0%, transparent 70%)' }}
      />
      <div
        className="pointer-events-none absolute bottom-1/4 right-1/4 h-80 w-80 translate-x-1/2 translate-y-1/2 rounded-full opacity-10 blur-3xl"
        style={{ background: 'radial-gradient(circle, #7c3aed 0%, transparent 70%)' }}
      />

      {/* Theme toggle — top right */}
      <div className="absolute right-5 top-5">
        <ThemeToggle />
      </div>

      <div className="relative z-10 w-full max-w-sm px-4">
        {/* Brand */}
        <div className="mb-8 text-center">
          <div
            className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500 text-2xl font-extrabold text-white dark:shadow-[0_0_24px_rgba(245,158,11,0.5)]"
            style={{ fontFamily: 'var(--font-syne)' }}
          >
            C
          </div>
          <h1
            className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-[#f0f0f6]"
            style={{ fontFamily: 'var(--font-syne)', letterSpacing: '-0.02em' }}
          >
            CARNIVAL
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 dark:text-[#8888a3]">
            Goal Setting &amp; Tracking Portal
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-[#22222e] dark:bg-[#111119]">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8888a3]">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="dark:border-[#22222e] dark:bg-[#1a1a26] dark:text-[#f0f0f6] dark:placeholder:text-[#5a5a72]"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-[#8888a3]">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                placeholder="Enter password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="dark:border-[#22222e] dark:bg-[#1a1a26] dark:text-[#f0f0f6] dark:placeholder:text-[#5a5a72]"
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 dark:bg-[#f59e0b] dark:text-[#09090f] dark:hover:bg-[#fbbf24] dark:shadow-[0_0_16px_rgba(245,158,11,0.3)]"
              disabled={loading}
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-6">
            <div className="mb-3 flex items-center gap-3">
              <div className="h-px flex-1 bg-slate-100 dark:bg-[#22222e]" />
              <span className="text-xs text-slate-400 dark:text-[#5a5a72]">Quick demo</span>
              <div className="h-px flex-1 bg-slate-100 dark:bg-[#22222e]" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              {DEMO_ROLES.map(({ role, label, color, bg }) => (
                <button
                  key={role}
                  disabled={loading}
                  onClick={() => loginAsDemo(role)}
                  className="rounded-xl border py-2 text-xs font-semibold transition-all hover:scale-[1.03] active:scale-[0.97] disabled:opacity-50"
                  style={{
                    borderColor: color + '40',
                    background: bg,
                    color,
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-center text-xs text-slate-400 dark:text-[#5a5a72]">
              [role]@carnival.demo · Demo@2026!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
