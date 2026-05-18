'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts'
import { uomLabel } from '@/lib/scoring'
import { UoMType } from '@/types'

interface CheckinRow { quarter: string; computed_score: number | null; department: string | null }
interface GoalRow { uom_type: string; thrust_area_name: string | null }
interface Manager { id: string; name: string }
interface Employee { id: string; manager_id: string | null }
interface Sheet { employee_id: string; status: string }

interface Props {
  checkins: CheckinRow[]
  goals: GoalRow[]
  managers: Manager[]
  employees: Employee[]
  sheets: Sheet[]
}

const QUARTERS = ['q1', 'q2', 'q3', 'q4']
const DEPT_COLORS: Record<string, string> = {
  Engineering: '#3b82f6', Sales: '#f97316', Operations: '#8b5cf6', HR: '#10b981', Finance: '#f59e0b',
}
const CHART_COLORS = ['#3b82f6', '#f59e0b', '#8b5cf6', '#10b981', '#f97316', '#f43f5e']

export function AnalyticsClient({ checkins, goals, managers, employees, sheets }: Props) {
  // QoQ trend
  const deptSet = new Set<string>()
  const qoqAccum: Record<string, Record<string, { sum: number; count: number }>> = {}
  for (const ci of checkins) {
    const dept = ci.department ?? 'Unknown'
    const score = ci.computed_score ?? 0
    deptSet.add(dept)
    if (!qoqAccum[ci.quarter]) qoqAccum[ci.quarter] = {}
    if (!qoqAccum[ci.quarter][dept]) qoqAccum[ci.quarter][dept] = { sum: 0, count: 0 }
    qoqAccum[ci.quarter][dept].sum += score
    qoqAccum[ci.quarter][dept].count += 1
  }
  const qoqData = QUARTERS.map(q => {
    const row: Record<string, string | number> = { quarter: q.toUpperCase() }
    for (const dept of deptSet) {
      const v = qoqAccum[q]?.[dept]
      row[dept] = v ? Math.round(v.sum / v.count) : 0
    }
    return row
  })
  const depts = Array.from(deptSet)

  // Goal distribution
  const thrustUomAccum: Record<string, Record<string, number>> = {}
  for (const g of goals) {
    const area = g.thrust_area_name ?? 'Other'
    const uom = uomLabel(g.uom_type as UoMType)
    if (!thrustUomAccum[area]) thrustUomAccum[area] = {}
    thrustUomAccum[area][uom] = (thrustUomAccum[area][uom] ?? 0) + 1
  }
  const allUoms = Array.from(new Set(goals.map(g => uomLabel(g.uom_type as UoMType))))
  const distData = Object.entries(thrustUomAccum).map(([area, counts]) => ({ area, ...counts }))

  // Manager effectiveness
  const managerData = managers.map(m => {
    const directReports = employees.filter(e => e.manager_id === m.id)
    if (!directReports.length) return null
    const withSheet = directReports.filter(e => sheets.some(s => s.employee_id === e.id && ['submitted', 'approved'].includes(s.status)))
    return { name: m.name.split(' ')[0], pct: Math.round((withSheet.length / directReports.length) * 100), total: directReports.length }
  }).filter(Boolean).sort((a, b) => (b!.pct - a!.pct)) as { name: string; pct: number; total: number }[]

  const sectionClass = "rounded-2xl border p-6"
  const sectionStyle = { background: 'var(--card)', borderColor: 'var(--border)' }
  const emptyClass = "flex items-center justify-center rounded-2xl border-2 border-dashed py-16 text-sm"
  const emptyStyle = { borderColor: 'var(--border)', color: 'var(--muted-foreground)' }

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">

      {/* ── Header ── */}
      <div className="border-b pb-8" style={{ borderColor: 'var(--border)' }}>
        <p className="mb-2 text-xs font-black uppercase tracking-[0.3em]" style={{ color: '#7c3aed' }}>Admin Panel</p>
        <h1
          className="text-5xl font-extrabold uppercase leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
        >
          Analytics
        </h1>
        <p className="mt-3 text-sm" style={{ color: 'var(--muted-foreground)' }}>
          Performance data across all departments and cycles
        </p>
      </div>

      {/* ── QoQ Trend ── */}
      <section>
        <h2
          className="mb-4 text-lg font-extrabold uppercase tracking-tight"
          style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}
        >
          Quarter-on-Quarter Avg Score
        </h2>
        {checkins.length === 0 ? (
          <div className={emptyClass} style={emptyStyle}>No check-in data yet</div>
        ) : (
          <div className={sectionClass} style={sectionStyle}>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={qoqData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="quarter" tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 700 }} unit="%" axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => typeof v === 'number' ? `${v}%` : v}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '1rem', color: 'var(--foreground)', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {depts.map((d, i) => (
                  <Line key={d} type="monotone" dataKey={d} stroke={Object.values(DEPT_COLORS)[i % 5] ?? CHART_COLORS[i % 6]} strokeWidth={2} dot={{ r: 4 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Goal Distribution ── */}
      <section>
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-tight" style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}>
          Goal Distribution by Thrust Area
        </h2>
        {distData.length === 0 ? (
          <div className={emptyClass} style={emptyStyle}>No goals created yet</div>
        ) : (
          <div className={sectionClass} style={sectionStyle}>
            <ResponsiveContainer width="100%" height={340}>
              <BarChart data={distData} margin={{ top: 8, right: 24, left: 0, bottom: 90 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="area" tick={{ fontSize: 10, fill: 'var(--muted-foreground)', fontWeight: 700 }} angle={-40} textAnchor="end" interval={0} dy={5} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 700 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '1rem', color: 'var(--foreground)', fontSize: 12 }} />
                <Legend verticalAlign="top" wrapperStyle={{ paddingBottom: 12, fontSize: 11 }} />
                {allUoms.map((u, i) => (
                  <Bar key={u} dataKey={u} stackId="a" fill={CHART_COLORS[i % 6]} radius={i === allUoms.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* ── Manager Effectiveness ── */}
      <section>
        <h2 className="mb-4 text-lg font-extrabold uppercase tracking-tight" style={{ fontFamily: 'var(--font-syne)', color: 'var(--foreground)' }}>
          Manager Effectiveness (submission rate)
        </h2>
        {managerData.length === 0 ? (
          <div className={emptyClass} style={emptyStyle}>No manager data available</div>
        ) : (
          <div className={sectionClass} style={sectionStyle}>
            <ResponsiveContainer width="100%" height={Math.max(120, managerData.length * 44)}>
              <BarChart layout="vertical" data={managerData} margin={{ top: 8, right: 60, left: 16, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 700 }} unit="%" axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 11, fill: 'var(--muted-foreground)', fontWeight: 700 }} width={80} axisLine={false} tickLine={false} />
                <Tooltip
                  formatter={(v) => typeof v === 'number' ? `${v}%` : v}
                  contentStyle={{ background: 'var(--popover)', border: '1px solid var(--border)', borderRadius: '1rem', color: 'var(--foreground)', fontSize: 12 }}
                />
                <Bar dataKey="pct" fill="#f59e0b" radius={[0, 6, 6, 0]} label={{ position: 'right', fontSize: 11, fill: 'var(--muted-foreground)' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
