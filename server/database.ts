/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { UserAccount, Student, Report, CriticalReport } from "../src/types";

const LOCAL_DB_DIR = path.join(process.cwd(), "data");
const CONFIG_PATH = path.join(LOCAL_DB_DIR, "config.json");

let cachedSupabaseClient: any = null;
let supabaseError: string | null = null;

/**
 * Retrieves the currently active Supabase configurations.
 */
export function getSupabaseConfig() {
  let url = process.env.SUPABASE_URL || "";
  let key = process.env.SUPABASE_ANON_KEY || "";

  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const config = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      if (config.supabaseUrl) {
        url = config.supabaseUrl;
      }
      if (config.supabaseAnonKey) {
        key = config.supabaseAnonKey;
      }
    }
  } catch (err) {
    console.error("Failed to read supabase config:", err);
  }

  return { url: url.trim(), key: key.trim() };
}

/**
 * Persists new active Supabase configurations.
 */
export function saveSupabaseConfig(url: string, key: string): void {
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    let currentConfig: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      } catch (e) {}
    }
    currentConfig.supabaseUrl = url.trim();
    currentConfig.supabaseAnonKey = key.trim();
    currentConfig.mode = "supabase";
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), "utf-8");
    cachedSupabaseClient = null; // reset cached client
    supabaseError = null;
  } catch (err) {
    console.error("Failed to write supabase config:", err);
    throw err;
  }
}

/**
 * Retrieves the current operational database mode.
 * Always returns "supabase" as it is now the only database.
 */
export function getDatabaseMode(): "supabase" {
  return "supabase";
}

/**
 * Saves the active database mode.
 * Always saves as "supabase".
 */
export function saveDatabaseMode(mode: string): void {
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    let currentConfig: any = {};
    if (fs.existsSync(CONFIG_PATH)) {
      try {
        currentConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, "utf-8"));
      } catch (e) {}
    }
    currentConfig.mode = "supabase";
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(currentConfig, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save database mode:", err);
  }
}

/**
 * Gets the initialized Supabase API client.
 */
export function getSupabaseClient() {
  if (cachedSupabaseClient) {
    return cachedSupabaseClient;
  }
  const { url, key } = getSupabaseConfig();
  console.log("getSupabaseClient: Configuring with URL:", url);
  if (!url || !key) {
    console.warn("getSupabaseClient: Missing URL or Key");
    return null;
  }
  try {
    cachedSupabaseClient = createClient(url, key);
    console.log("getSupabaseClient: Client created successfully");
    return cachedSupabaseClient;
  } catch (err: any) {
    console.error("Failed to initialize Supabase client:", err);
    supabaseError = err.message;
    return null;
  }
}

function mapSupabaseRowToUser(row: any): UserAccount {
  return {
    firstName: row.first_name || "",
    middleName: row.middle_name || "",
    lastName: row.last_name || "",
    email: row.email || "",
    contactNumber: row.contact_number || "",
    department: row.department || "",
    position: row.position || "",
    passwordHash: row.password_hash || "",
    registeredAt: row.registered_at || "",
    role: row.role || "Non-Adviser",
    gradeLevel: row.grade_level,
    section: row.section,
  };
}

function mapUserToSupabaseRow(user: UserAccount) {
  const row: any = {
    email: user.email,
    first_name: user.firstName,
    middle_name: user.middleName,
    last_name: user.lastName,
    contact_number: user.contactNumber,
    department: user.department,
    position: user.position,
    password_hash: user.passwordHash,
    registered_at: user.registeredAt,
  };
  return row;
}

/**
 * Returns diagnostic info about the database connection.
 */
export function getDatabaseStatus() {
  const { url, key } = getSupabaseConfig();
  const hasSupabase = !!url && !!key;

  return {
    mode: "supabase" as const,
    configured: hasSupabase,
    supabaseUrl: url,
    supabaseAnonKey: key,
    error: supabaseError,
  };
}

/**
 * Initialize the database.
 * For supabase mode: tests connection and catches schemas discrepancies.
 */
export async function initDatabase() {
  // Always ensure data folder exists for config files
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
  } catch (err) {
    console.error("Config database directory checkout failed:", err);
  }

  const supabase = getSupabaseClient();
  if (!supabase) {
    supabaseError = "Supabase URL or Anon Key is missing.";
    return;
  }
  try {
    // Test connection with a fast light query on users table
    const { data, error } = await supabase.from("users").select("email").limit(1);
    if (error) {
      if (error.code === "PGRST116" || error.message?.includes("does not exist") || error.code === "42P01") {
        supabaseError = "Table 'users' does not exist in your Supabase database. Please create it in your SQL Editor.";
      } else {
        supabaseError = `Supabase API error: ${error.message} (Code: ${error.code})`;
      }
      console.error("Supabase test query error:", error);
    } else {
      console.log("✅ Supabase connection successful! 'users' table online.");
      supabaseError = null;
    }
  } catch (err: any) {
    supabaseError = `Connection failed: ${err.message}`;
    console.error("Supabase connection exception:", err);
  }
}

/**
 * Loads all user records from Supabase.
 */
export async function getAllUsers(): Promise<UserAccount[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return [];
  }
  try {
    const { data, error } = await supabase.from("users").select("*");
    if (error) {
      console.error("Supabase read users failure:", error);
      supabaseError = `Supabase query failed: ${error.message}`;
      return [];
    }
    supabaseError = null;
    return (data || []).map(mapSupabaseRowToUser);
  } catch (err: any) {
    console.error("Supabase read connection error:", err);
    supabaseError = `Supabase connection exception: ${err.message}`;
    return [];
  }
}

/**
 * Searches a user account by email (Username).
 */
export async function getUserByEmail(email: string): Promise<UserAccount | null> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return null;
  }
  const searchEmail = email.trim().toLowerCase();
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("email", searchEmail)
      .maybeSingle();

    if (error) {
      console.error("Supabase getUserByEmail failed, falling back to scanning all users:", error);
      // fallback scan
      const users = await getAllUsers();
      return users.find(u => u.email.trim().toLowerCase() === searchEmail) || null;
    }

    if (!data) return null;
    return mapSupabaseRowToUser(data);
  } catch (err) {
    console.error("Supabase getUserByEmail exception, fallback to scanning:", err);
    const users = await getAllUsers();
    return users.find(u => u.email.trim().toLowerCase() === searchEmail) || null;
  }
}

/**
 * Save user account to active database.
 */
export async function createUser(user: UserAccount): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured yet. Please configure it in DB panel.");
  }
  try {
    const row = mapUserToSupabaseRow(user);
    const { error } = await supabase.from("users").insert([row]);
    if (error) {
      console.error("Supabase register write failure:", error);
      supabaseError = `Supabase write failed: ${error.message}`;
      throw new Error(`Database write error: ${error.message}`);
    } else {
      supabaseError = null;
      console.log(`✅ Inserted registrant ${user.email} in Supabase.`);
    }
  } catch (err: any) {
    console.error("Supabase insert connection error:", err);
    supabaseError = `Supabase write exception: ${err.message}`;
    throw err;
  }
}

/**
 * Update user specifications.
 */
export async function updateUser(email: string, updatedFields: Partial<UserAccount>): Promise<UserAccount> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase is not configured yet.");
  }

  const existingProfile = await getUserByEmail(email);
  if (!existingProfile) {
    throw new Error(`Profile not found for email user ${email}`);
  }

  const updatedProfile: UserAccount = {
    ...existingProfile,
    ...updatedFields,
    email: existingProfile.email, // Keep email username immutable as requested
  };

  try {
    const row = mapUserToSupabaseRow(updatedProfile);
    const { error } = await supabase.from("users").update(row).eq("email", updatedProfile.email);
    if (error) {
      console.error("Supabase update users failure:", error);
      supabaseError = `Supabase write failed: ${error.message}`;
      throw new Error(`Database update error: ${error.message}`);
    } else {
      supabaseError = null;
      console.log(`✅ Updated registrant ${updatedProfile.email} in Supabase.`);
    }
  } catch (err: any) {
    console.error("Supabase update connection error:", err);
    supabaseError = `Supabase connection exception: ${err.message}`;
    throw err;
  }

  return updatedProfile;
}

// ==========================================
// STUDENT REGISTRATION DATABASE OPERATIONS
// ==========================================

const STUDENTS_DB_PATH = path.join(LOCAL_DB_DIR, "students.json");

function loadLocalStudents(): Student[] {
  try {
    if (fs.existsSync(STUDENTS_DB_PATH)) {
      const data = fs.readFileSync(STUDENTS_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load local students database cache:", err);
  }
  return [];
}

function saveStudentLocally(student: Student): void {
  try {
    const list = loadLocalStudents();
    const index = list.findIndex(s => s.lrn.trim() === student.lrn.trim());
    if (index >= 0) {
      list[index] = student;
    } else {
      list.push(student);
    }
    fs.writeFileSync(STUDENTS_DB_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save student locally:", err);
  }
}

function saveStudentsLocallyBulk(students: Student[]): void {
  try {
    const list = loadLocalStudents();
    for (const student of students) {
      const index = list.findIndex(s => s.lrn.trim() === student.lrn.trim());
      if (index >= 0) {
        list[index] = student;
      } else {
        list.push(student);
      }
    }
    fs.writeFileSync(STUDENTS_DB_PATH, JSON.stringify(list, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save students bulk locally:", err);
  }
}

function mapSupabaseRowToStudent(row: any): Student {
  return {
    lrn: row.lrn || "",
    lastName: row.last_name || "",
    firstName: row.first_name || "",
    middleName: row.middle_name || "",
    gradeLevel: row.grade_level || "Grade 7",
    section: row.section || "",
    gender: row.gender || "Male",
    dateOfBirth: row.date_of_birth || "",
    heightCm: Number(row.height_cm) || 0,
    weightKg: Number(row.weight_kg) || 0,
    religion: row.religion || "",
    religionSpecify: row.religion_specify || "",
    is4ps: row.is_4ps || "No",
    isIndigenous: row.is_indigenous || "No",
    fatherName: row.father_name || "",
    fatherContact: row.father_contact || "",
    fatherIncome: row.father_income || "",
    motherName: row.mother_name || "",
    motherContact: row.mother_contact || "",
    motherIncome: row.mother_income || "",
    guardianName: row.guardian_name || "",
    guardianRelationship: row.guardian_relationship || "",
    guardianContact: row.guardian_contact || "",
    guardianIncome: row.guardian_income || "",
    siblingsCount: Number(row.siblings_count) || 0,
    siblingsBelow18: Number(row.siblings_below_18) || 0,
    ordinalOrder: row.ordinal_order || "",
    houseNumber: row.house_number || "",
    street: row.street || "",
    barangay: row.barangay || "",
    city: row.city || "",
    learningModality: row.learning_modality || "Face-to-Face",
    internetConnectivity: row.internet_connectivity || "None",
    registeredAt: row.registered_at || "",
    registeredBy: row.registered_by || "",
  };
}

function mapStudentToSupabaseRow(student: Student) {
  return {
    lrn: student.lrn,
    last_name: student.lastName,
    first_name: student.firstName,
    middle_name: student.middleName,
    grade_level: student.gradeLevel,
    section: student.section,
    gender: student.gender,
    date_of_birth: student.dateOfBirth,
    height_cm: student.heightCm,
    weight_kg: student.weightKg,
    religion: student.religion,
    religion_specify: student.religionSpecify || "",
    is_4ps: student.is4ps,
    is_indigenous: student.isIndigenous,
    father_name: student.fatherName,
    father_contact: student.fatherContact,
    father_income: student.fatherIncome,
    mother_name: student.motherName,
    mother_contact: student.motherContact,
    mother_income: student.motherIncome,
    guardian_name: student.guardianName,
    guardian_relationship: student.guardianRelationship,
    guardian_contact: student.guardianContact,
    guardian_income: student.guardianIncome,
    siblings_count: student.siblingsCount,
    siblings_below_18: student.siblingsBelow18,
    ordinal_order: student.ordinalOrder,
    house_number: student.houseNumber,
    street: student.street,
    barangay: student.barangay,
    city: student.city,
    learning_modality: student.learningModality,
    internet_connectivity: student.internetConnectivity,
    registered_at: student.registeredAt || new Date().toISOString(),
    registered_by: student.registeredBy || "",
  };
}

/**
 * Search students by LRN or Last Name.
 */
export async function searchStudents(query: string): Promise<Student[]> {
  const supabase = getSupabaseClient();
  const allStudents = await getAllStudents();
  const lowerQuery = query.toLowerCase().trim();

  return allStudents.filter(
    (s) =>
      s.lrn.toLowerCase().includes(lowerQuery) ||
      s.lastName.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Save critical student report.
 */
/**
 * Save critical student report.
 */
export async function saveCriticalReport(report: CriticalReport): Promise<any> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("critical_reports").insert([
    {
      student_lrn: report.studentLrn,
      date_of_incident: report.dateOfIncident,
      time_of_incident: report.timeOfIncident,
      issue: report.issue,
      description: report.description,
      action_taken: report.actionTaken,
      recommendation: report.recommendation,
      reported_by: report.reportedBy,
      date_reported: report.dateReported,
    },
  ]);
  if (error) throw error;
  return data;
}

/**
 * Retrieve all sections.
 */
export async function getSections(): Promise<{ grade_level: string; section_name: string }[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("sections").select("grade_level, section_name");
  if (error) return [];
  return data || [];
}

/**
 * Retrieve sections by grade level.
 */
export async function getSectionsByGradeLevel(gradeLevel: string): Promise<string[]> {
  console.log("getSectionsByGradeLevel called with:", gradeLevel);
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("sections").select("section_name").eq("grade_level", gradeLevel);
  if (error) {
    console.error("Supabase sections error:", error);
    return [];
  }
  console.log("Supabase sections data (raw):", data);
  return (data || []).map(s => s.section_name);
}

/**
 * Save student report.
 */
export async function saveReport(report: Report): Promise<any> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase.from("reports").insert([
    {
      student_lrn: report.studentLrn,
      date_of_incident: report.dateOfIncident,
      time_of_incident: report.timeOfIncident,
      issue: report.issue,
      description: report.description,
      action_taken: report.actionTaken,
      recommendation: report.recommendation,
      created_at: new Date().toISOString(),
      created_by: report.createdBy,
      reported_by: report.reportedBy,
      date_reported: report.dateReported,
      individual_factors: report.individualFactors,
      family_community_behavior_factors: report.familyCommunityBehaviorFactors,
      referral_recommendation: report.referralRecommendation,
      initial_assessment_made_by: report.initialAssessmentMadeBy,
      designation: report.designation,
      record_status: report.recordStatus,
    },
  ]);
  if (error) throw error;
  return data;
}

/**
 * Retrieve all student reports.
 */
export async function getAllReports(): Promise<Report[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("reports").select("*");
  if (error) {
    console.error("Supabase read reports failure:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    studentLrn: row.student_lrn,
    dateOfIncident: row.date_of_incident,
    timeOfIncident: row.time_of_incident,
    issue: row.issue,
    description: row.description,
    actionTaken: row.action_taken,
    recommendation: row.recommendation,
    reportedBy: row.reported_by,
    dateReported: row.date_reported,
    individualFactors: row.individual_factors || [],
    familyCommunityBehaviorFactors: row.family_community_behavior_factors || [],
    referralRecommendation: row.referral_recommendation,
    initialAssessmentMadeBy: row.initial_assessment_made_by,
    designation: row.designation,
    recordStatus: row.record_status,
  }));
}

/**
 * Retrieve all critical student reports.
 */
export async function getAllCriticalReports(): Promise<CriticalReport[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  const { data, error } = await supabase.from("critical_reports").select("*");
  if (error) {
    console.error("Supabase read critical reports failure:", error);
    return [];
  }
  return (data || []).map((row: any) => ({
    studentLrn: row.student_lrn,
    dateOfIncident: row.date_of_incident,
    timeOfIncident: row.time_of_incident,
    issue: row.issue,
    description: row.description,
    actionTaken: row.action_taken,
    recommendation: row.recommendation,
    reportedBy: row.reported_by,
    dateReported: row.date_reported,
  }));
}

/**
 * Retrieve all registered student records.
 */
export async function getAllStudents(): Promise<Student[]> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return loadLocalStudents();
  }
  try {
    const { data, error } = await supabase.from("students").select("*");
    if (error) {
      console.error("Supabase read students failure, falling back to local cache:", error);
      return loadLocalStudents();
    }
    return (data || []).map(mapSupabaseRowToStudent);
  } catch (err) {
    console.error("Supabase read students exception, falling back to local cache:", err);
    return loadLocalStudents();
  }
}

/**
 * Administrative: Clear all reports from database.
 */
export async function clearAllReports(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error: error1 } = await supabase.from("reports").delete().neq("student_lrn", "");
  const { error: error2 } = await supabase.from("critical_reports").delete().neq("student_lrn", "");
  
  if (error1) console.error("Error clearing reports:", error1);
  if (error2) console.error("Error clearing critical reports:", error2);
}

/**
 * Administrative: Clear all students from database.
 */
export async function clearAllStudents(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error } = await supabase.from("students").delete().neq("lrn", "");
  if (error) console.error("Error clearing students:", error);
  
  // Also clear local cache
  if (fs.existsSync(STUDENTS_DB_PATH)) {
    fs.writeFileSync(STUDENTS_DB_PATH, JSON.stringify([], null, 2), "utf-8");
  }
}

/**
 * Administrative: Delete a user account.
 */
export async function deleteUser(email: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error } = await supabase.from("users").delete().eq("email", email.trim().toLowerCase());
  if (error) {
    console.error(`Error deleting user ${email}:`, error);
    throw new Error(error.message);
  }
}

/**
 * Administrative: Create a new section.
 */
export async function createSection(grade: string, name: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error } = await supabase.from("sections").insert({ grade_level: grade, section_name: name });
  if (error) throw error;
}

/**
 * Administrative: Update an existing section.
 */
export async function updateSection(oldGrade: string, oldName: string, newGrade: string, newName: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error } = await supabase.from("sections")
    .update({ grade_level: newGrade, section_name: newName })
    .match({ grade_level: oldGrade, section_name: oldName });
    
  if (error) throw error;
}

/**
 * Administrative: Delete a section.
 */
export async function deleteSection(grade: string, name: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const { error } = await supabase.from("sections")
    .delete()
    .match({ grade_level: grade, section_name: name });
    
  if (error) throw error;
}

/**
 * Registers a single student into Supabase with localized JSON write-through backup.
 */
export async function createStudent(student: Student): Promise<void> {
  // Always update local cache backup
  saveStudentLocally(student);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    const row = mapStudentToSupabaseRow(student);
    const { error } = await supabase.from("students").upsert(row);
    if (error) {
      console.error("Supabase upsert student failure, backed up locally:", error);
      throw new Error(`Supabase write failed: ${error.message}`);
    }
  } catch (err: any) {
    console.error("Supabase upsert student exception, backed up locally:", err);
    throw err;
  }
}

/**
 * Registers multiple students in bulk into Supabase with localized JSON write-through backup.
 */
export async function createStudentsBulk(students: Student[]): Promise<{ successCount: number; errors: string[] }> {
  saveStudentsLocallyBulk(students);

  const response = { successCount: 0, errors: [] as string[] };
  const supabase = getSupabaseClient();
  if (!supabase) {
    response.successCount = students.length; // backed up locally
    return response;
  }

  try {
    const rows = students.map(mapStudentToSupabaseRow);
    const { error } = await supabase.from("students").upsert(rows);
    if (error) {
      console.error("Supabase bulk upsert failed. Retrying upserts individually...", error);
      // Fallback: try individual upserts
      for (const student of students) {
        try {
          const row = mapStudentToSupabaseRow(student);
          const { error: indError } = await supabase.from("students").upsert(row);
          if (indError) {
            response.errors.push(`LRN ${student.lrn}: ${indError.message}`);
          } else {
            response.successCount++;
          }
        } catch (indEx: any) {
          response.errors.push(`LRN ${student.lrn}: ${indEx.message}`);
        }
      }
    } else {
      response.successCount = students.length;
    }
  } catch (err: any) {
    console.error("Supabase bulk upsert exception:", err);
    response.errors.push(`Bulk upsert exception: ${err.message}`);
  }

  return response;
}

