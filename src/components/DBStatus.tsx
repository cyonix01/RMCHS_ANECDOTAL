/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from "react";
import { Database, CheckCircle, AlertTriangle, X, Edit2, Check, Copy } from "lucide-react";

interface DBStatusData {
  mode: "supabase";
  configured: boolean;
  supabaseUrl?: string;
  supabaseAnonKey?: string;
  error: string | null;
}

export default function DBStatus() {
  const [status, setStatus] = useState<DBStatusData | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  
  // Supabase states
  const [supabaseUrl, setSupabaseUrl] = useState("");
  const [supabaseAnonKey, setSupabaseAnonKey] = useState("");
  const [isEditingSupabase, setIsEditingSupabase] = useState(false);

  // General loading/success/error states
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  // Supabase Storage Diagnostics states
  const [storageDiagnostic, setStorageDiagnostic] = useState<{
    running: boolean;
    result: any;
    error: any;
  } | null>(null);

  const runStorageDiagnostics = async () => {
    setStorageDiagnostic({ running: true, result: null, error: null });
    try {
      const res = await fetch("/api/diagnose-storage");
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setStorageDiagnostic({ running: false, result: data, error: null });
        } else {
          setStorageDiagnostic({ running: false, result: null, error: data.error || data });
        }
      } else {
        throw new Error(`HTTP Error ${res.status}`);
      }
    } catch (err: any) {
      setStorageDiagnostic({
        running: false,
        result: null,
        error: { message: err.message || "Unknown error occurred" }
      });
    }
  };

  const fetchStatus = async () => {
    try {
      const res = await fetch("/api/db-status");
      if (res.ok) {
        const data = await res.json();
        setStatus(data);
        if (!isEditingSupabase) {
          setSupabaseUrl(data.supabaseUrl || "");
          setSupabaseAnonKey(data.supabaseAnonKey || "");
        }
      }
    } catch (err) {
      console.error("Failed to query database status:", err);
    }
  };

  useEffect(() => {
    fetchStatus();
    // Poll status occasionally to keep in sync
    const interval = setInterval(fetchStatus, 15000);
    return () => clearInterval(interval);
  }, [isEditingSupabase]);

  const handleSaveSupabase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseUrl.trim() || !supabaseAnonKey.trim()) {
      setErrorMessage("Both Supabase URL and Anon Key are required.");
      return;
    }

    setIsSaving(true);
    setErrorMessage("");
    setSaveSuccess(false);

    try {
      const response = await fetch("/api/save-supabase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: supabaseUrl.trim(), anonKey: supabaseAnonKey.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to update Supabase configuration");
      }

      setSaveSuccess(true);
      setIsEditingSupabase(false);
      await fetchStatus();
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred saving Supabase.");
    } finally {
      setIsSaving(false);
    }
  };

  const copySQLToClipboard = () => {
    const sql = `-- Create users table
create table if not exists users (
  email text primary key,
  first_name text,
  middle_name text,
  profile_picture_url text,
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

-- Create students table
create table if not exists students (
  lrn text primary key,
  last_name text,
  first_name text,
  middle_name text,
  profile_picture_url text,
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
  record_status text default 'On Going'
);

-- Create notifications table
create table if not exists notifications (
  id serial primary key,
  message text not null,
  type text not null,
  student_lrn text,
  student_name text,
  reported_by text,
  target_role text not null,
  is_read boolean default false,
  read_by jsonb default '[]'::jsonb,
  created_at text not null
);`;
    navigator.clipboard.writeText(sql);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!status) return null;

  const isConnected = status.configured && !status.error;

  return (
    <div id="db-status-container" className="relative font-sans text-[#1A1A1A]">
      <button
        id="db-status-trigger"
        onClick={() => setShowInfo(!showInfo)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-none text-[9px] font-bold tracking-widest uppercase cursor-pointer transition-all border ${
          isConnected
            ? "bg-emerald-50/80 text-emerald-800 border-emerald-300/60 hover:bg-emerald-100"
            : status.error
            ? "bg-red-50/80 text-red-800 border-red-300/60 hover:bg-red-100"
            : "bg-amber-50/80 text-amber-800 border-amber-300/60 hover:bg-amber-100"
        }`}
      >
        <Database id="db-status-icon" size={11} className={isConnected ? "" : "animate-pulse"} />
        <span>DB: Supabase</span>
        <span
          id="db-status-dot"
          className={`w-1.5 h-1.5 rounded-full ${
            isConnected ? "bg-emerald-600" : status.error ? "bg-red-600" : "bg-amber-500"
          }`}
        />
      </button>

      {showInfo && (
        <div
          id="db-info-panel"
          className="absolute right-0 mt-2 w-96 p-5 bg-white border border-slate-300 rounded-none shadow-lg z-50 animate-fade-in text-slate-700 font-sans"
        >
          <div className="flex justify-between items-start mb-4 pb-2 border-b border-slate-100">
            <div>
              <h4 id="db-info-title" className="font-serif font-bold text-sm text-[#1A1A1A] flex items-center gap-1.5">
                Supabase Database Manager
              </h4>
              <p className="text-[10px] text-slate-400 mt-0.5">Configure your live Postgres cloud database connection</p>
            </div>
            <button
              id="db-info-close"
              onClick={() => {
                setShowInfo(false);
                setIsEditingSupabase(false);
              }}
              className="text-slate-400 hover:text-slate-900 cursor-pointer"
            >
              <X size={14} />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-3 p-2.5 bg-red-50 text-red-800 border border-red-200 text-[10px] rounded-none">
              <span className="font-bold">Error:</span> {errorMessage}
            </div>
          )}

          {saveSuccess && (
            <div className="mb-3 p-2 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] flex items-center gap-1.5 font-semibold">
              <Check size={12} className="text-emerald-600" />
              Supabase configuration updated successfully!
            </div>
          )}

          <div className="space-y-4 text-xs">
            <div className="space-y-3">
              <div className="border border-slate-100 p-3 bg-slate-50/50 space-y-2.5">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400">Connection Credentials</span>
                  {!isEditingSupabase && (
                    <button
                      onClick={() => setIsEditingSupabase(true)}
                      className="text-sky-600 hover:text-sky-900 flex items-center gap-0.5 text-[9px] uppercase font-bold cursor-pointer"
                    >
                      <Edit2 size={10} /> Edit Config
                    </button>
                  )}
                </div>

                {isEditingSupabase ? (
                  <form onSubmit={handleSaveSupabase} className="space-y-2">
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mb-1">Project URL</label>
                      <input
                        type="text"
                        value={supabaseUrl}
                        onChange={(e) => setSupabaseUrl(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 text-[10px] font-mono rounded-none focus:outline-none focus:border-sky-500"
                        placeholder="https://your-project.supabase.co"
                        disabled={isSaving}
                      />
                    </div>
                    <div>
                      <label className="block text-[8px] uppercase tracking-wider font-bold text-slate-500 mb-1">Anon API Key</label>
                      <textarea
                        rows={2}
                        value={supabaseAnonKey}
                        onChange={(e) => setSupabaseAnonKey(e.target.value)}
                        className="w-full px-2 py-1.5 border border-slate-300 text-[10px] font-mono rounded-none focus:outline-none focus:border-sky-500 resize-none"
                        placeholder="Your public anon key"
                        disabled={isSaving}
                      />
                    </div>
                    <div className="flex justify-end gap-1.5 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsEditingSupabase(false);
                          setSupabaseUrl(status.supabaseUrl || "");
                          setSupabaseAnonKey(status.supabaseAnonKey || "");
                        }}
                        className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider border border-slate-300 text-slate-500 rounded-none hover:bg-slate-50"
                        disabled={isSaving}
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        className="px-2.5 py-1 text-[9px] font-bold uppercase tracking-wider bg-sky-600 text-white border border-sky-700 rounded-none hover:bg-sky-700"
                        disabled={isSaving}
                      >
                        {isSaving ? "Saving..." : "Save Credentials"}
                      </button>
                    </div>
                  </form>
                ) : (
                  <div className="space-y-1.5">
                    <div>
                      <span className="block text-[8px] uppercase text-slate-400 font-bold">API Endpoint:</span>
                      <span className="font-mono text-[9px] text-slate-700 break-all bg-white p-1 border border-slate-100 block">
                        {status.supabaseUrl || "Not Configured"}
                      </span>
                    </div>
                    <div>
                      <span className="block text-[8px] uppercase text-slate-400 font-bold">Anon Public Key:</span>
                      <span className="font-mono text-[9px] text-slate-700 truncate block bg-white p-1 border border-slate-100">
                        {status.supabaseAnonKey || "Not Configured"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {isConnected ? (
                <div className="p-3 bg-emerald-50/55 border border-emerald-200 text-emerald-950 space-y-1.5">
                  <div className="flex gap-1.5">
                    <CheckCircle size={14} className="shrink-0 text-emerald-600 mt-0.5" />
                    <p className="font-bold text-xs">Supabase Connected Successfully</p>
                  </div>
                  <p className="text-[10px] text-slate-600 leading-relaxed">
                    Your credentials are live! Real-time sync of teacher registries is operational.
                  </p>
                </div>
              ) : (
                <div className="p-3 bg-amber-50/60 border border-amber-200 text-amber-950 space-y-2">
                  <div className="flex gap-1.5">
                    <AlertTriangle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                    <p className="font-bold text-xs leading-tight">Supabase Connection Required</p>
                  </div>
                  <p className="text-[10px] leading-relaxed text-slate-600">
                    To connect your active registry, execute the SQL script below in your Supabase SQL Editor to prepare your database:
                  </p>
                  <div className="relative font-mono text-[8px] bg-slate-950 text-slate-300 p-2 border border-slate-800 leading-normal max-h-32 overflow-y-auto">
                    <pre>{`-- Create users table
create table if not exists users (
  email text primary key,
  first_name text,
  middle_name text,
  profile_picture_url text,
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

-- Create students table
create table if not exists students (
  lrn text primary key,
  last_name text,
  first_name text,
  middle_name text,
  profile_picture_url text,
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
);`}</pre>
                    <button
                      onClick={copySQLToClipboard}
                      className="absolute right-1.5 top-1.5 bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 p-1 rounded-sm cursor-pointer transition-colors"
                      title="Copy SQL Query"
                    >
                      {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                    </button>
                  </div>
                  {copied && <p className="text-[8px] font-semibold text-emerald-700 font-mono">✓ Copied SQL to clipboard!</p>}
                </div>
              )}

              {/* Migration / Schema Fix Section */}
              <div className="p-3 bg-indigo-50/60 border border-indigo-200 text-indigo-950 space-y-2">
                <div className="flex gap-1.5">
                  <Edit2 size={14} className="shrink-0 text-indigo-600 mt-0.5" />
                  <p className="font-bold text-xs leading-tight">Missing Columns? (Schema Fix)</p>
                </div>
                <p className="text-[10px] leading-relaxed text-slate-600">
                  If you see an error about missing columns (role, designation, etc.), run these in your Supabase SQL Editor:
                </p>
                <div className="relative font-mono text-[8px] bg-indigo-950 text-indigo-200 p-2 border border-indigo-800 leading-normal max-h-40 overflow-y-auto">
                  <pre>{`-- Fix users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS section text;

-- Fix reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_updated_by text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS individual_factors jsonb default '[]'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS family_community_behavior_factors jsonb default '[]'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS referral_recommendation text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS initial_assessment_made_by text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS record_status text default 'On Going';

-- Fix critical_reports table
ALTER TABLE critical_reports ADD COLUMN IF NOT EXISTS record_status text default 'On Going';
ALTER TABLE critical_reports ADD COLUMN IF NOT EXISTS last_updated_by text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id serial primary key,
  message text not null,
  type text not null,
  student_lrn text,
  student_name text,
  reported_by text,
  target_role text not null,
  is_read boolean default false,
  read_by jsonb default '[]'::jsonb,
  created_at text not null
);`}</pre>
                  <button
                    onClick={() => {
                      const fixSql = `-- Fix users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS role text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS grade_level text;
ALTER TABLE users ADD COLUMN IF NOT EXISTS section text;

-- Fix reports table
ALTER TABLE reports ADD COLUMN IF NOT EXISTS last_updated_by text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS individual_factors jsonb default '[]'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS family_community_behavior_factors jsonb default '[]'::jsonb;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS referral_recommendation text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS initial_assessment_made_by text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS designation text;
ALTER TABLE reports ADD COLUMN IF NOT EXISTS record_status text default 'On Going';

-- Fix critical_reports table
ALTER TABLE critical_reports ADD COLUMN IF NOT EXISTS record_status text default 'On Going';
ALTER TABLE critical_reports ADD COLUMN IF NOT EXISTS last_updated_by text;

-- Create notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id serial primary key,
  message text not null,
  type text not null,
  student_lrn text,
  student_name text,
  reported_by text,
  target_role text not null,
  is_read boolean default false,
  read_by jsonb default '[]'::jsonb,
  created_at text not null
);`;
                      navigator.clipboard.writeText(fixSql);
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    className="absolute right-1.5 top-1.5 bg-indigo-900 hover:bg-indigo-800 text-white border border-indigo-700 p-1 rounded-sm cursor-pointer transition-colors"
                    title="Copy Fix SQL"
                  >
                    {copied ? <Check size={10} className="text-emerald-400" /> : <Copy size={10} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Supabase Storage Diagnostics Section */}
            <div className="p-3 bg-slate-50 border border-slate-200 text-slate-900 space-y-2">
              <div className="flex justify-between items-center">
                <div className="flex gap-1.5 items-center">
                  <Database size={14} className="text-[#102604]" />
                  <p className="font-bold text-xs leading-tight">Supabase Storage 'MOVs' Diagnostics</p>
                </div>
                <button
                  type="button"
                  onClick={runStorageDiagnostics}
                  disabled={storageDiagnostic?.running}
                  className="px-2 py-1 text-[8px] font-black uppercase tracking-wider bg-[#102604] hover:bg-[#102604]/90 text-white rounded-none cursor-pointer disabled:opacity-50"
                >
                  {storageDiagnostic?.running ? "Running..." : "Run Test"}
                </button>
              </div>
              <p className="text-[10px] leading-relaxed text-slate-500">
                Verify if your Supabase configurations can successfully locate, connect, and retrieve read/write metadata from the 'MOVs' storage bucket.
              </p>

              {storageDiagnostic && (
                <div className="mt-2 text-[10px] space-y-1.5 p-2 bg-white border border-slate-200">
                  {storageDiagnostic.running && (
                    <p className="text-slate-500 animate-pulse font-bold">Running Supabase Storage connection test...</p>
                  )}

                  {storageDiagnostic.result && (
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-1 text-emerald-700 font-bold">
                        <CheckCircle size={12} />
                        <span>Supabase 'MOVs' Storage Bucket Found!</span>
                      </div>
                      <p className="text-[9px] text-slate-600 font-mono">
                        <strong>Bucket Name:</strong> {storageDiagnostic.result.bucket?.name || "Unknown"}<br />
                        <strong>ID:</strong> {storageDiagnostic.result.bucket?.id || "Unknown"}<br />
                        <strong>MIME Filters:</strong> {storageDiagnostic.result.bucket?.allowed_mime_types?.join(", ") || "Any type allowed"}<br />
                        <strong>Access Mode:</strong> {storageDiagnostic.result.bucket?.public ? "Public Access (Shared)" : "Private Storage"}<br />
                        <strong>Existing File Count (Limit 5):</strong> {storageDiagnostic.result.filesCount} file(s) scanned
                      </p>
                      <details className="cursor-pointer text-[8px]">
                        <summary className="text-[#102604] font-bold underline">Show detailed diagnostics logs</summary>
                        <pre className="mt-1 bg-slate-950 text-slate-300 p-1.5 overflow-x-auto text-[8px] font-mono leading-normal max-h-32">
                          {storageDiagnostic.result.logs?.join("\n")}
                        </pre>
                      </details>
                    </div>
                  )}

                  {storageDiagnostic.error && (
                    <div className="space-y-1.5 text-red-800">
                      <div className="flex items-center gap-1 font-bold">
                        <AlertTriangle size={12} className="text-red-600" />
                        <span>Supabase Storage Test Failed</span>
                      </div>
                      <p className="text-[9px] bg-red-50 p-1.5 border border-red-100 font-mono break-words leading-tight">
                        {storageDiagnostic.error.message || JSON.stringify(storageDiagnostic.error)}
                      </p>
                      {storageDiagnostic.error.status && (
                        <p className="text-[9px] font-semibold text-red-600">
                          Status Code: {storageDiagnostic.error.status}
                        </p>
                      )}
                      <details className="cursor-pointer text-[8px]">
                        <summary className="text-red-700 font-bold underline">Show execution log</summary>
                        <pre className="mt-1 bg-slate-950 text-slate-300 p-1.5 overflow-x-auto text-[8px] font-mono leading-normal max-h-32">
                          {JSON.stringify(storageDiagnostic.error, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Diagnostics and Errors */}
            {status.error && (
              <div className="p-2.5 bg-red-50 text-red-800 border border-red-200 text-[10px] max-h-24 overflow-y-auto">
                <span className="font-bold block mb-0.5">Connection Diagnostics:</span>
                {status.error}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
