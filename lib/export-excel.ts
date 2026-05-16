import * as XLSX from 'xlsx'
import { Goal, CheckIn, Profile, Quarter } from '@/types'

interface ReportRow {
  employee: Profile
  goal: Goal
  checkIns: CheckIn[]
}

export function exportAchievementReport(rows: ReportRow[], filename?: string) {
  const quarters: Quarter[] = ['q1', 'q2', 'q3', 'q4']

  const data = rows.map(({ employee, goal, checkIns }) => {
    const row: Record<string, string | number> = {
      Employee: employee.name,
      Department: employee.department ?? '',
      'Goal Title': goal.title,
      'UoM Type': goal.uom_type,
      'Target Value': goal.target_value ?? '',
      'Target Date': goal.target_date ?? '',
      'Weightage (%)': goal.weightage,
    }

    quarters.forEach((q) => {
      const ci = checkIns.find((c) => c.quarter === q)
      row[`${q.toUpperCase()} Actual`] = ci?.actual_value ?? ci?.actual_date ?? ''
      row[`${q.toUpperCase()} Score (%)`] = ci?.computed_score ?? ''
      row[`${q.toUpperCase()} Status`] = ci?.progress_status ?? 'not_started'
    })

    return row
  })

  const ws = XLSX.utils.json_to_sheet(data)
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, 'Achievement Report')
  XLSX.writeFile(wb, filename ?? `atomflow_report_${Date.now()}.xlsx`)
}
