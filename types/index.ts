export type Role = 'employee' | 'manager' | 'admin'
export type CyclePhase = 'goal_setting' | 'q1' | 'q2' | 'q3' | 'q4'
export type SheetStatus = 'draft' | 'submitted' | 'approved' | 'returned'
export type ProgressStatus = 'not_started' | 'on_track' | 'completed'
export type UoMType = 'min_numeric' | 'max_numeric' | 'min_percent' | 'max_percent' | 'timeline' | 'zero'
export type EscalationRuleType = 'submission_delay' | 'approval_delay' | 'checkin_delay'
export type Quarter = 'q1' | 'q2' | 'q3' | 'q4'

export interface Profile {
  id: string
  name: string
  email: string
  role: Role
  department: string | null
  manager_id: string | null
  created_at: string
  manager?: Profile
}

export interface GoalCycle {
  id: string
  name: string
  year: number
  phase: CyclePhase
  opens_at: string
  closes_at: string | null
  is_active: boolean
}

export interface ThrustArea {
  id: string
  name: string
  description: string | null
  color: string
}

export interface GoalTemplate {
  id: string
  thrust_area_id: string
  title: string
  description: string | null
  uom_type: UoMType
  suggested_weightage: number
  thrust_area?: ThrustArea
}

export interface GoalSheet {
  id: string
  employee_id: string
  cycle_id: string
  status: SheetStatus
  submitted_at: string | null
  approved_at: string | null
  approved_by: string | null
  return_reason: string | null
  created_at: string
  employee?: Profile
  cycle?: GoalCycle
  goals?: Goal[]
}

export interface Goal {
  id: string
  sheet_id: string
  thrust_area_id: string | null
  title: string
  description: string | null
  uom_type: UoMType
  target_value: number | null
  target_date: string | null
  weightage: number
  is_shared: boolean
  shared_from_goal_id: string | null
  title_readonly: boolean
  target_readonly: boolean
  position: number
  created_at: string
  thrust_area?: ThrustArea
  check_ins?: CheckIn[]
}

export interface CheckIn {
  id: string
  goal_id: string
  cycle_id: string
  quarter: Quarter
  actual_value: number | null
  actual_date: string | null
  progress_status: ProgressStatus
  computed_score: number | null
  manager_comment: string | null
  updated_at: string
}

export interface ManagerCheckinSession {
  id: string
  manager_id: string
  employee_id: string
  cycle_id: string
  quarter: Quarter
  session_comment: string | null
  created_at: string
}

export interface AuditLogEntry {
  id: string
  actor_id: string | null
  action: string
  entity_type: string
  entity_id: string
  old_values: Record<string, unknown> | null
  new_values: Record<string, unknown> | null
  reason: string | null
  created_at: string
  actor?: Profile
}

export interface EscalationRule {
  id: string
  rule_type: EscalationRuleType
  threshold_days: number
  is_active: boolean
}

export interface Escalation {
  id: string
  rule_id: string | null
  target_user_id: string | null
  status: 'pending' | 'resolved'
  message: string | null
  created_at: string
  target_user?: Profile
}

export interface DemoUser {
  id: string
  name: string
  role: Role
  email: string
}
