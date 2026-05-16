-- ============================================================
-- carnival — Goal Setting & Tracking Portal
-- Schema Migration 001
-- ============================================================

-- Profiles (extends Supabase auth.users)
create table public.profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  email text not null,
  role text not null check (role in ('employee', 'manager', 'admin')),
  department text,
  manager_id uuid references public.profiles(id),
  created_at timestamptz default now()
);

-- Goal cycles (annual, with phases)
create table public.goal_cycles (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  year int not null,
  phase text not null check (phase in ('goal_setting', 'q1', 'q2', 'q3', 'q4')),
  opens_at date not null,
  closes_at date,
  is_active boolean default false
);

-- Thrust areas (configured by admin)
create table public.thrust_areas (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  color text default '#64748b'
);

-- Goal templates (admin creates, employees import)
create table public.goal_templates (
  id uuid primary key default gen_random_uuid(),
  thrust_area_id uuid references public.thrust_areas(id) on delete cascade,
  title text not null,
  description text,
  uom_type text not null check (uom_type in ('min_numeric','max_numeric','min_percent','max_percent','timeline','zero')),
  suggested_weightage int default 20,
  created_by uuid references public.profiles(id)
);

-- Goal sheets (one per employee per cycle)
create table public.goal_sheets (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references public.profiles(id) not null,
  cycle_id uuid references public.goal_cycles(id) not null,
  status text not null default 'draft'
    check (status in ('draft', 'submitted', 'approved', 'returned')),
  submitted_at timestamptz,
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  return_reason text,
  created_at timestamptz default now(),
  unique(employee_id, cycle_id)
);

-- Individual goals on a sheet
create table public.goals (
  id uuid primary key default gen_random_uuid(),
  sheet_id uuid references public.goal_sheets(id) on delete cascade not null,
  thrust_area_id uuid references public.thrust_areas(id),
  title text not null,
  description text,
  uom_type text not null check (uom_type in ('min_numeric','max_numeric','min_percent','max_percent','timeline','zero')),
  target_value numeric,
  target_date date,
  weightage int not null check (weightage >= 10),
  is_shared boolean default false,
  shared_from_goal_id uuid references public.goals(id),
  title_readonly boolean default false,
  target_readonly boolean default false,
  position int default 0,
  created_at timestamptz default now()
);

-- Quarterly check-ins (actual achievement per goal per quarter)
create table public.check_ins (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid references public.goals(id) on delete cascade not null,
  cycle_id uuid references public.goal_cycles(id) not null,
  quarter text not null check (quarter in ('q1', 'q2', 'q3', 'q4')),
  actual_value numeric,
  actual_date date,
  progress_status text default 'not_started'
    check (progress_status in ('not_started', 'on_track', 'completed')),
  computed_score numeric,
  manager_comment text,
  updated_at timestamptz default now(),
  unique(goal_id, quarter)
);

-- Manager check-in session comments (per employee per quarter)
create table public.manager_checkin_sessions (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid references public.profiles(id) not null,
  employee_id uuid references public.profiles(id) not null,
  cycle_id uuid references public.goal_cycles(id) not null,
  quarter text not null,
  session_comment text,
  created_at timestamptz default now(),
  unique(manager_id, employee_id, cycle_id, quarter)
);

-- Audit log (tracks all post-lock changes)
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles(id),
  action text not null,
  entity_type text not null,
  entity_id uuid not null,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz default now()
);

-- Escalation rules (configurable by admin)
create table public.escalation_rules (
  id uuid primary key default gen_random_uuid(),
  rule_type text not null check (rule_type in ('submission_delay', 'approval_delay', 'checkin_delay')),
  threshold_days int not null default 5,
  is_active boolean default true
);

-- Escalation instances (triggered by cron)
create table public.escalations (
  id uuid primary key default gen_random_uuid(),
  rule_id uuid references public.escalation_rules(id),
  target_user_id uuid references public.profiles(id),
  status text default 'pending' check (status in ('pending', 'resolved')),
  message text,
  created_at timestamptz default now()
);

-- ============================================================
-- Row Level Security
-- ============================================================

alter table public.profiles enable row level security;
alter table public.goal_cycles enable row level security;
alter table public.thrust_areas enable row level security;
alter table public.goal_templates enable row level security;
alter table public.goal_sheets enable row level security;
alter table public.goals enable row level security;
alter table public.check_ins enable row level security;
alter table public.manager_checkin_sessions enable row level security;
alter table public.audit_log enable row level security;
alter table public.escalation_rules enable row level security;
alter table public.escalations enable row level security;

-- Profiles: everyone can read all profiles (needed for manager lookups)
create policy "profiles_read_all" on public.profiles for select using (true);
create policy "profiles_update_own" on public.profiles for update using (auth.uid() = id);

-- Goal cycles: everyone can read
create policy "cycles_read_all" on public.goal_cycles for select using (true);

-- Thrust areas: everyone can read
create policy "thrust_areas_read_all" on public.thrust_areas for select using (true);

-- Goal templates: everyone can read
create policy "templates_read_all" on public.goal_templates for select using (true);

-- Goal sheets: employees see own, managers see their team, admins see all
create policy "sheets_select" on public.goal_sheets for select using (
  employee_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
);
create policy "sheets_insert" on public.goal_sheets for insert with check (employee_id = auth.uid());
create policy "sheets_update" on public.goal_sheets for update using (
  employee_id = auth.uid()
  or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
);

-- Goals: follow sheet access
create policy "goals_select" on public.goals for select using (
  exists (
    select 1 from public.goal_sheets gs
    where gs.id = goals.sheet_id
    and (
      gs.employee_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
    )
  )
);
create policy "goals_insert" on public.goals for insert with check (
  exists (
    select 1 from public.goal_sheets gs
    join public.profiles p on p.id = auth.uid()
    where gs.id = goals.sheet_id
    and (gs.employee_id = auth.uid() or p.role in ('manager', 'admin'))
  )
);
create policy "goals_update" on public.goals for update using (
  exists (
    select 1 from public.goal_sheets gs
    where gs.id = goals.sheet_id
    and (
      gs.employee_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
    )
  )
);
create policy "goals_delete" on public.goals for delete using (
  exists (
    select 1 from public.goal_sheets gs
    where gs.id = goals.sheet_id
    and (
      gs.employee_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
    )
  )
);

-- Check-ins: employees see own, managers see team
create policy "checkins_select" on public.check_ins for select using (
  exists (
    select 1 from public.goals g
    join public.goal_sheets gs on gs.id = g.sheet_id
    where g.id = check_ins.goal_id
    and (
      gs.employee_id = auth.uid()
      or exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
    )
  )
);
create policy "checkins_insert" on public.check_ins for insert with check (true);
create policy "checkins_update" on public.check_ins for update using (true);

-- Manager sessions: managers and admins
create policy "sessions_all" on public.manager_checkin_sessions for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
  or manager_id = auth.uid()
  or employee_id = auth.uid()
);

-- Audit log: admins and managers can read
create policy "audit_select" on public.audit_log for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
);
create policy "audit_insert" on public.audit_log for insert with check (true);

-- Escalation rules: everyone can read
create policy "escalation_rules_read" on public.escalation_rules for select using (true);
create policy "escalation_rules_manage" on public.escalation_rules for all using (
  exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
);

-- Escalations: admins and managers can read
create policy "escalations_select" on public.escalations for select using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
  or target_user_id = auth.uid()
);
create policy "escalations_insert" on public.escalations for insert with check (true);
create policy "escalations_update" on public.escalations for update using (
  exists (select 1 from public.profiles where id = auth.uid() and role in ('manager', 'admin'))
);
