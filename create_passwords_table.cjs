const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.log("No Supabase env vars, skipping.");
  process.exit(0);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { error } = await supabase.rpc('exec_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS admin_passwords (
        id integer PRIMARY KEY,
        clear_reports text NOT NULL,
        clear_students text NOT NULL,
        delete_teacher text NOT NULL,
        updated_at timestamp with time zone DEFAULT now()
      );
    `
  });
  
  if (error) {
    console.log("Could not execute RPC. Assuming table might not be created natively or user needs to do it.");
  } else {
    console.log("Table admin_passwords ensured.");
  }
}
run();
