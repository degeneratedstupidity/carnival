'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Role } from '@/types'

const ROLE_PATHS: Record<Role, string> = {
  employee: '/employee/goals',
  manager: '/manager/approvals',
  admin: '/admin/dashboard',
}

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
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-orange-500 text-xl font-bold text-white">
            C
          </div>
          <h1 className="text-2xl font-bold text-slate-900">Carnival</h1>
          <p className="text-sm text-slate-500">Goal Setting & Tracking Portal</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sign in</CardTitle>
            <CardDescription>Enter your company email and password</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-orange-500 hover:bg-orange-600" disabled={loading}>
                {loading ? 'Signing in...' : 'Sign in'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-slate-600">Demo Mode</CardTitle>
            <CardDescription className="text-xs">Sign in as a demo user to explore all features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-3 gap-2">
              {(['employee', 'manager', 'admin'] as Role[]).map((role) => (
                <Button
                  key={role}
                  variant="outline"
                  size="sm"
                  disabled={loading}
                  onClick={() => loginAsDemo(role)}
                  className="capitalize"
                >
                  {role}
                </Button>
              ))}
            </div>
            <p className="mt-2 text-xs text-slate-400">
              Credentials: [role]@carnival.demo / Demo@2026!
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
