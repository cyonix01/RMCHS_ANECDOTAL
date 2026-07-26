-- Create users table
create table if not exists users (
  email text primary key,
  first_name text,
  middle_name text,
  last_name text,
  contact_number text,
  department text,
  position text,
  password_hash text,
  registered_at text,
  role text,
  grade_level text,
  section text
);

-- Create sections table
create table if not exists sections (
  id serial primary key,
  grade_level text,
  section_name text
);

-- Create students table
create table if not exists students (
  lrn text primary key,
  last_name text,
  first_name text,
  middle_name text,
  grade_level text,
  section text,
  gender text,
  date_of_birth text,
  height_cm numeric,
  weight_kg numeric,
  religion text,
  religion_specify text,
  is_4ps text,
  is_indigenous text,
  father_name text,
  father_contact text,
  father_income text,
  mother_name text,
  mother_contact text,
  mother_income text,
  guardian_name text,
  guardian_relationship text,
  guardian_contact text,
  guardian_income text,
  siblings_count integer,
  siblings_below_18 integer,
  ordinal_order text,
  house_number text,
  street text,
  barangay text,
  city text,
  learning_modality text,
  internet_connectivity text,
  registered_at text,
  registered_by text
);

-- Create critical_reports table
create table if not exists critical_reports (
  id serial primary key,
  student_lrn text references students(lrn),
  date_of_incident text,
  time_of_incident text,
  issue text,
  description text,
  action_taken text,
  recommendation text,
  reported_by text,
  date_reported text,
  last_updated_by text,
  record_status text default 'On Going'
);

-- Create reports table
create table if not exists reports (
  id serial primary key,
  student_lrn text references students(lrn),
  date_of_incident text,
  time_of_incident text,
  issue text,
  description text,
  action_taken text,
  recommendation text,
  created_at text,
  created_by text,
  reported_by text,
  date_reported text,
  last_updated_by text,
  individual_factors jsonb default '[]'::jsonb,
  family_community_behavior_factors jsonb default '[]'::jsonb,
  referral_recommendation text,
  initial_assessment_made_by text,
  designation text,
  record_status text default 'On Going'
);

-- Create notifications table
create table if not exists notifications (
  id serial primary key,
  message text not null,
  type text not null, -- 'General' | 'Critical' | 'CICL'
  student_lrn text,
  student_name text,
  reported_by text,
  target_role text not null, -- 'Guidance' | 'Admin' | 'All'
  is_read boolean default false,
  read_by jsonb default '[]'::jsonb, -- array of user emails who have read it
  created_at text not null
);

-- Create signatory_settings table
create table if not exists signatory_settings (
  id integer primary key default 1,
  prepared_by_name text default '',
  prepared_by_position text default '',
  noted_by_name text default '',
  noted_by_position text default '',
  approved_by_name text default '',
  approved_by_position text default '',
  updated_at text
);

-- Create admin_passwords table
create table if not exists admin_passwords (
  id integer primary key default 1,
  clear_reports text default 'NoMoreReporting',
  clear_students text default 'VacationTime',
  delete_teacher text default 'HolidayTime',
  updated_at text
);

-- Create audit_logs table for Admin Audit Log System
create table if not exists audit_logs (
  id text primary key,
  timestamp text not null,
  action text not null,
  performed_by text,
  ip_address text,
  target_id text,
  target_name text,
  details text,
  previous_values jsonb,
  new_values jsonb
);

-- Ensure ip_address column exists if table was created earlier without it
alter table audit_logs add column if not exists ip_address text;

-- Disable Row Level Security or grant permissive RLS policy
alter table audit_logs disable row level security;

-- In case RLS is forcefully enabled by Supabase project settings, create permissive policies:
drop policy if exists "Allow all read on audit_logs" on audit_logs;
drop policy if exists "Allow all insert on audit_logs" on audit_logs;
drop policy if exists "Allow all update on audit_logs" on audit_logs;
drop policy if exists "Allow all delete on audit_logs" on audit_logs;

create policy "Allow all read on audit_logs" on audit_logs for select using (true);
create policy "Allow all insert on audit_logs" on audit_logs for insert with check (true);
create policy "Allow all update on audit_logs" on audit_logs for update using (true);
create policy "Allow all delete on audit_logs" on audit_logs for delete using (true);

-- Grant table access to anon, authenticated, and service roles
grant all on table audit_logs to anon, authenticated, service_role;

-- Indexes for audit_logs query optimization
create index if not exists idx_audit_logs_timestamp on audit_logs(timestamp desc);
create index if not exists idx_audit_logs_action on audit_logs(action);
create index if not exists idx_audit_logs_performed_by on audit_logs(performed_by);

