'use client'

import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  BarChart, Bar, ResponsiveContainer,
} from 'recharts'

interface CheckinRow {
  quarter: string
  computed_score: number | null
  department: string | null
}

interface GoalRow {
  uom_type: string
  thrust_area_name: string | null
}

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
  Engineering: '#3b82f6',
  Sales: '#f97316',
  Operations: '#8b5cf6',
  HR: '#22c55e',
  Finance: '#f59e0b',
}
const UOM_LABELS: Record<string, string> = {
  min_numeric: 'Min Num',
  max_numeric: 'Max Num',
  min_percent: 'Min %',
  max_percent: 'Max %',
  timeline: 'Timeline',
  zero: 'Zero',
}

export function AnalyticsClient({ checkins, goals, managers, employees, sheets }: Props) {
  // QoQ trend: avg score by quarter by department
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

  // Goal distribution by thrust area + uom_type
  const thrustUomAccum: Record<string, Record<string, number>> = {}
  for (const g of goals) {
    const area = g.thrust_area_name ?? 'Other'
    const uom = UOM_LABELS[g.uom_type] ?? g.uom_type
    if (!thrustUomAccum[area]) thrustUomAccum[area] = {}
    thrustUomAccum[area][uom] = (thrustUomAccum[area][uom] ?? 0) + 1
  }
  const allUoms = Array.from(new Set(goals.map(g => UOM_LABELS[g.uom_type] ?? g.uom_type)))
  const distData = Object.entries(thrustUomAccum).map(([area, counts]) => ({
    area, ...counts,
  }))

  // Manager effectiveness: % of direct reports with submitted/approved sheets
  const managerData = managers.map(m => {
    const directReports = employees.filter(e => e.manager_id === m.id)
    if (!directReports.length) return null
    const withSheet = directReports.filter(e =>
      sheets.some(s => s.employee_id === e.id && ['submitted', 'approved'].includes(s.status))
    )
    return {
      name: m.name.split(' ')[0],
      pct: Math.round((withSheet.length / directReports.length) * 100),
      total: directReports.length,
    }
  }).filter(Boolean).sort((a, b) => (b!.pct - a!.pct)) as { name: string; pct: number; total: number }[]

  return (
    <div className="mx-auto max-w-6xl p-6 space-y-10">
      <div>
        <h1 className="text-xl font-bold text-slate-900">Analytics</h1>
        <p className="text-sm text-slate-500 mt-1">Performance data across all departments and cycles.</p>
      </div>

      {/* QoQ Trend */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Quarter-on-Quarter Avg Score by Department</h2>
        {checkins.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No check-in data yet. Scores will appear after employees log actuals.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={qoqData} margin={{ top: 8, right: 24, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="quarter" tick={{ fontSize: 12 }} />
                <YAxis domain={[0, 120]} tick={{ fontSize: 12 }} unit="%" />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${v}%` : v} />
                <Legend />
                {depts.map((d, i) => (
                  <Line
                    key={d}
                    type="monotone"
                    dataKey={d}
                    stroke={Object.values(DEPT_COLORS)[i % 5]}
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Goal Distribution */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Goal Distribution by Thrust Area and UoM Type</h2>
        {distData.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No goals created yet.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={distData} margin={{ top: 8, right: 24, left: 0, bottom: 48 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="area" tick={{ fontSize: 11 }} angle={-20} textAnchor="end" interval={0} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Legend />
                {allUoms.map((u, i) => {
                  const colors = ['#3b82f6', '#f97316', '#8b5cf6', '#22c55e', '#f59e0b', '#ef4444']
                  return <Bar key={u} dataKey={u} stackId="a" fill={colors[i % 6]} />
                })}
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      {/* Manager Effectiveness */}
      <section>
        <h2 className="text-sm font-semibold text-slate-700 mb-4">Manager Effectiveness (team submission rate)</h2>
        {managerData.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-slate-200 p-10 text-center text-sm text-slate-500">
            No manager data available.
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <ResponsiveContainer width="100%" height={Math.max(120, managerData.length * 44)}>
              <BarChart
                layout="vertical"
                data={managerData}
                margin={{ top: 8, right: 40, left: 16, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 12 }} unit="%" />
                <YAxis type="category" dataKey="name" tick={{ fontSize: 12 }} width={80} />
                <Tooltip formatter={(v) => typeof v === 'number' ? `${v}%` : v} />
                <Bar dataKey="pct" fill="#0f172a" radius={[0, 4, 4, 0]} label={{ position: 'right', fontSize: 11, fill: '#64748b' }} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>
    </div>
  )
}
