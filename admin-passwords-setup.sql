-- Run this in your Supabase SQL Editor

CREATE TABLE IF NOT EXISTS admin_passwords (
  id integer PRIMARY KEY,
  clear_reports text NOT NULL,
  clear_students text NOT NULL,
  delete_teacher text NOT NULL,
  updated_at timestamp with time zone DEFAULT now()
);

-- Insert the default passwords (id is always 1)
INSERT INTO admin_passwords (id, clear_reports, clear_students, delete_teacher)
VALUES (
  1, 
  'NoMoreReporting', 
  'VacationTime', 
  'HolidayTime'
) ON CONFLICT (id) DO NOTHING;
