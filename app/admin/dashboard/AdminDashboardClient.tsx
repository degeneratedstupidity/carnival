'use client'

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { Users, Target, CheckCircle2, Clock, ShieldAlert, TrendingUp, Activity } from 'lucide-react'
import Link from 'next/link'

interface DeptRow { name: string; submitted: number; approved: number; total: number }
interface AuditRow { actor: string; action: string; time: string }

interface Props {
  activeCycleName: string | null
  totalEmployees: number
  submitted: number
  approved: number
  pending: number
  submissionRate: number
  approvalRate: number
  escalations: { id: string; message: string }[]
  deptData: DeptRow[]
  recentAudit: AuditRow[]
}

export function AdminDashboardClient({
  activeCycleName,
  totalEmployees,
  submitted,
  approved,
  pending,
  submissionRate,
  approvalRate,
  escalations,
  deptData,
  recentAudit,
}: Props) {
  const kpis = [
    { label: 'Total_Employees', value: totalEmployees, icon: Users,        color: '#8888a3', span: 'col-span-12 md:col-span-3' },
    { label: 'Sheets_Submitted', value: submitted,      icon: Clock,        color: '#3b82f6', span: 'col-span-12 md:col-span-3' },
    { label: 'Sheets_Approved',  value: approved,       icon: CheckCircle2, color: '#10b981', span: 'col-span-12 md:col-span-3' },
    { label: 'Pending_Submission', value: pending,      icon: Target,       color: '#f59e0b', span: 'col-span-12 md:col-span-3' },
  ]

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">

      {/* ── Header ── */}
      <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#7c3aed' }}>
          Admin Panel
        </p>
        <h1
          className="text-5xl font-extrabold uppercase leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
        >
          Dashboard
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          {activeCycleName ?? 'No active cycle'} — System-wide performance monitoring
        </p>
      </div>

      {/* ── Submission & Approval Rates ── */}
      <div className="grid grid-cols-12 gap-4">
        <div
          className="col-span-12 flex items-center gap-6 rounded-2xl border p-5 md:col-span-6"
          style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.2)' }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(59,130,246,0.12)' }}
          >
            <TrendingUp className="h-7 w-7" style={{ color: '#3b82f6' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#3b82f6' }}>
              Submission Rate
            </p>
            <p className="text-4xl font-extrabold" style={{ color: '#3b82f6', fontFamily: 'var(--font-syne)' }}>
              {submissionRate}%
            </p>
          </div>
        </div>
        <div
          className="col-span-12 flex items-center gap-6 rounded-2xl border p-5 md:col-span-6"
          style={{ background: 'rgba(16,185,129,0.06)', borderColor: 'rgba(16,185,129,0.2)' }}
        >
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
            style={{ background: 'rgba(16,185,129,0.12)' }}
          >
            <CheckCircle2 className="h-7 w-7" style={{ color: '#10b981' }} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: '#10b981' }}>
              Approval Rate
            </p>
            <p className="text-4xl font-extrabold" style={{ color: '#10b981', fontFamily: 'var(--font-syne)' }}>
              {approvalRate}%
            </p>
          </div>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-12 gap-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon
          return (
            <div
              key={kpi.label}
              className={`${kpi.span} rounded-2xl border p-6 transition-all`}
              style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
            >
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em]" style={{ color: 'var(--muted-foreground)' }}>
                    {kpi.label}
                  </p>
                  <p
                    className="text-4xl font-extrabold"
                    style={{ color: kpi.color, fontFamily: 'var(--font-syne)' }}
                  >
                    {kpi.value}
                  </p>
                </div>
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl"
                  style={{ background: `${kpi.color}15`, color: kpi.color }}
                >
                  <Icon className="h-5 w-5" />
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Chart + Activity ── */}
      <div className="grid grid-cols-12 gap-6">
        {/* Bar Chart */}
        <div
          className="col-span-12 rounded-2xl border p-6 lg:col-span-8"
          style={{ background: 'var(--card)', borderColor: 'var(--border)' }}
        >
          <h2
            className="mb-6 text-xl font-extrabold uppercase tracking-tight"
            style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
          >
            Department_Coverage_Matrix
          </h2>
          {deptData.length === 0 ? (
            <div className="flex h-48 items-center justify-center text-sm" style={{ color: 'var(--muted-foreground)' }}>
              No department data yet
            </div>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--muted-foreground)', fontSize: 10, fontWeight: 700 }}
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '1rem',
                      color: 'var(--foreground)',
                      fontSize: 12,
                    }}
                    cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  />
                  <Bar dataKey="submitted" fill="#3b82f6" radius={[6, 6, 6, 6]} barSize={20} />
                  <Bar dataKey="approved"  fill="#10b981" radius={[6, 6, 6, 6]} barSize={20} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Live Activity */}
        <div
          className="col-span-12 flex flex-col overflow-hidden rounded-2xl border p-6 lg:col-span-4"
          style={{ background: 'var(--foreground)', borderColor: 'transparent' }}
        >
          <div className="relative z-10 flex-1">
            <p
              className="mb-6 text-[10px] font-black uppercase tracking-[0.3em]"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              Live_Activity_Feed
            </p>
            {recentAudit.length === 0 ? (
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>No recent activity</p>
            ) : (
              <div className="space-y-4">
                {recentAudit.map((act, i) => (
                  <div key={i} className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5">
                      <div
                        className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full"
                        style={{ background: '#f59e0b' }}
                      />
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight" style={{ color: 'rgba(255,255,255,0.9)' }}>
                          {act.actor}
                        </p>
                        <p className="text-[10px] font-mono" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {act.action}
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-mono whitespace-nowrap" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {act.time}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Link
            href="/admin/audit"
            className="mt-6 block w-full rounded-xl border py-2.5 text-center text-[10px] font-black uppercase tracking-widest transition-all hover:bg-white hover:text-black"
            style={{ borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.6)' }}
          >
            Full_Audit_Trail
          </Link>
        </div>
      </div>

      {/* ── Escalation alerts ── */}
      {escalations.length > 0 && (
        <div
          className="rounded-2xl border p-5"
          style={{ background: 'rgba(244,63,94,0.05)', borderColor: 'rgba(244,63,94,0.2)' }}
        >
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" style={{ color: '#f43f5e' }} />
              <h3 className="text-sm font-black uppercase tracking-wider" style={{ color: '#f43f5e' }}>
                Pending Escalations ({escalations.length})
              </h3>
            </div>
            <Link href="/admin/escalations" className="text-xs font-bold uppercase tracking-widest" style={{ color: '#f43f5e' }}>
              View All →
            </Link>
          </div>
          <ul className="space-y-2">
            {escalations.map(e => (
              <li key={e.id} className="flex items-start gap-2 text-sm" style={{ color: 'var(--foreground)' }}>
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: '#f43f5e' }} />
                {e.message}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
