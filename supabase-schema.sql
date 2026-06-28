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

