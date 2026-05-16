-- ============================================================
-- Carnival Seed Data
-- Run AFTER creating auth users via Supabase Dashboard or CLI
-- Demo credentials:
--   employee@carnival.demo / Demo@2026!
--   manager@carnival.demo  / Demo@2026!
--   admin@carnival.demo    / Demo@2026!
-- ============================================================

-- This file inserts into public.profiles.
-- Auth users must be created first via Supabase Auth.
-- The IDs below are placeholders — replace with actual auth.users UUIDs.
-- For demo purposes, use the Supabase dashboard to create these 3 users,
-- then update the UUIDs here and run this seed in the SQL editor.

-- ============================================================
-- Thrust Areas
-- ============================================================
insert into public.thrust_areas (id, name, description, color) values
  ('aa000001-0000-0000-0000-000000000001', 'Revenue Growth', 'Sales targets, new accounts, revenue milestones', '#22c55e'),
  ('aa000001-0000-0000-0000-000000000002', 'Operational Excellence', 'Process efficiency, TAT, cost reduction', '#3b82f6'),
  ('aa000001-0000-0000-0000-000000000003', 'People Development', 'Learning, engagement, team health', '#a855f7'),
  ('aa000001-0000-0000-0000-000000000004', 'Customer Experience', 'NPS, satisfaction, retention', '#f97316'),
  ('aa000001-0000-0000-0000-000000000005', 'Quality & Safety', 'Defect rates, safety incidents, compliance', '#ef4444')
on conflict do nothing;

-- ============================================================
-- Goal Cycles — 2 past + 1 active
-- ============================================================
insert into public.goal_cycles (id, name, year, phase, opens_at, closes_at, is_active) values
  ('cc000001-0000-0000-0000-000000000001', 'FY 2024', 2024, 'q4', '2024-01-01', '2024-12-31', false),
  ('cc000001-0000-0000-0000-000000000002', 'FY 2025', 2025, 'q4', '2025-01-01', '2025-12-31', false),
  ('cc000001-0000-0000-0000-000000000003', 'FY 2026 — Goal Setting', 2026, 'goal_setting', '2026-05-01', '2026-05-31', true)
on conflict do nothing;

-- ============================================================
-- Escalation Rules
-- ============================================================
insert into public.escalation_rules (rule_type, threshold_days, is_active) values
  ('submission_delay', 5, true),
  ('approval_delay', 3, true),
  ('checkin_delay', 7, true)
on conflict do nothing;

-- ============================================================
-- Goal Templates
-- ============================================================
insert into public.goal_templates (thrust_area_id, title, description, uom_type, suggested_weightage) values
  ('aa000001-0000-0000-0000-000000000001', 'Achieve Revenue Target', 'Meet or exceed the assigned annual revenue target for the territory.', 'min_numeric', 30),
  ('aa000001-0000-0000-0000-000000000001', 'New Account Acquisition', 'Acquire new accounts in the assigned segment.', 'min_numeric', 20),
  ('aa000001-0000-0000-0000-000000000002', 'Reduce Process TAT', 'Reduce turnaround time for key processes.', 'max_numeric', 20),
  ('aa000001-0000-0000-0000-000000000002', 'Cost Savings Initiative', 'Identify and implement cost reduction measures.', 'min_numeric', 15),
  ('aa000001-0000-0000-0000-000000000003', 'Complete Training Hours', 'Complete assigned learning and development programs.', 'min_numeric', 15),
  ('aa000001-0000-0000-0000-000000000003', 'Team Engagement Score', 'Improve or maintain team engagement score.', 'min_percent', 10),
  ('aa000001-0000-0000-0000-000000000004', 'Customer Satisfaction Score', 'Maintain or improve customer satisfaction rating.', 'min_percent', 25),
  ('aa000001-0000-0000-0000-000000000004', 'On-time Delivery Rate', 'Ensure orders are delivered within committed timelines.', 'min_percent', 20),
  ('aa000001-0000-0000-0000-000000000005', 'Safety Incident Count', 'Maintain zero safety incidents in the work area.', 'zero', 20),
  ('aa000001-0000-0000-0000-000000000005', 'Quality Defect Rate', 'Reduce product defect rate below target threshold.', 'max_percent', 15)
on conflict do nothing;

-- ============================================================
-- NOTE: To complete seed setup:
-- 1. Go to Supabase Dashboard > Authentication > Users
-- 2. Create 3 users with these emails and password Demo@2026!:
--    - admin@carnival.demo
--    - manager@carnival.demo
--    - employee@carnival.demo
-- 3. Copy the UUIDs from the auth.users table
-- 4. Run the profile inserts below in SQL editor with actual UUIDs
-- ============================================================

-- Example profile inserts (replace UUIDs with actual auth.users IDs):
-- insert into public.profiles (id, name, email, role, department) values
--   ('<admin-uuid>', 'Carol Singh', 'admin@carnival.demo', 'admin', 'HR'),
--   ('<manager-uuid>', 'Bob Mehta', 'manager@carnival.demo', 'manager', 'Sales'),
--   ('<employee-uuid>', 'Alice Sharma', 'employee@carnival.demo', 'employee', 'Sales');
-- update public.profiles set manager_id = '<manager-uuid>' where email = 'employee@carnival.demo';
