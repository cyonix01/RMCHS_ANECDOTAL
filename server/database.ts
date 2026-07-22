/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

dotenv.config({ override: true });
import { UserAccount, Student, Report, CriticalReport, AppNotification } from "../src/types";

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
    role: user.role,
    grade_level: user.gradeLevel,
    section: user.section
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
      if (error.code === "PGRST116" || error.code === "PGRST205" || error.message?.includes("does not exist") || error.code === "42P01") {
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
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from("users").select("*").range(from, from + step - 1);
      if (error) {
        console.error("Supabase read users failure:", error);
        supabaseError = `Supabase query failed: ${error.message}`;
        return [];
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < step) {
          break;
        }
      } else {
        break;
      }
      from += step;
    }
    supabaseError = null;
    return allData.map(mapSupabaseRowToUser);
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
      let userMsg = error.message;
      if (error.message.includes("column \"role\" does not exist") || 
          error.message.includes("column \"grade_level\" does not exist") || 
          error.message.includes("column \"section\" does not exist") ||
          error.message.includes("Could not find the 'role' column")) {
        userMsg = "Database schema mismatch. Some required columns (role, grade_level, section) are missing in your Supabase 'users' table. Please click the DB Status button at the top and follow the 'Schema Fix' instructions.";
      }
      supabaseError = `Supabase write failed: ${userMsg}`;
      throw new Error(`Database write error: ${userMsg}`);
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
      let userMsg = error.message;
      if (error.message.includes("column \"role\" does not exist") || 
          error.message.includes("column \"grade_level\" does not exist") || 
          error.message.includes("column \"section\" does not exist") ||
          error.message.includes("Could not find the 'role' column")) {
        userMsg = "Database schema mismatch. Some required columns (role, grade_level, section) are missing in your Supabase 'users' table. Please click the DB Status button at the top and follow the 'Schema Fix' instructions.";
      }
      supabaseError = `Supabase write failed: ${userMsg}`;
      throw new Error(`Database update error: ${userMsg}`);
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
    profilePictureUrl: row.profile_picture_url || "",
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
    profile_picture_url: student.profilePictureUrl || "",
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
 * Search students by LRN, First Name, Last Name, or Section Name.
 */
export async function searchStudents(query: string): Promise<Student[]> {
  const allStudents = await getAllStudents();
  const lowerQuery = query.toLowerCase().trim();

  return allStudents.filter(
    (s) =>
      s.lrn.toLowerCase().includes(lowerQuery) ||
      s.firstName.toLowerCase().includes(lowerQuery) ||
      s.lastName.toLowerCase().includes(lowerQuery) ||
      s.section.toLowerCase().includes(lowerQuery)
  );
}

/**
 * Save critical student report.
 */
export async function saveCriticalReport(report: any): Promise<any> {
  const supabase = getSupabaseClient();

  // Handle both camelCase, snake_case, and flat lowercase properties
  const studentLrn = String(report.studentLrn || report.student_lrn || report.studentlrn || "").trim();
  const dateOfIncident = report.dateOfIncident || report.date_of_incident || report.dateofincident || "";
  const timeOfIncident = report.timeOfIncident || report.time_of_incident || report.timeofincident || "";
  const issue = report.issue || "";
  const description = report.description || "";
  const actionTaken = report.actionTaken || report.action_taken || report.actiontaken || "";
  const recommendation = report.recommendation || "";
  const reportedBy = report.reportedBy || report.reported_by || report.reportedby || "";
  const dateReported = report.dateReported || report.date_reported || report.datereported || new Date().toISOString();
  const recordStatus = report.recordStatus || report.record_status || report.recordstatus || 'On Going';

  if (!studentLrn) {
    throw new Error("Student LRN is required.");
  }

  // Ensure student exists in Supabase so the foreign key constraint is satisfied
  const existingStudent = await getStudentByLrn(studentLrn);
  if (!existingStudent) {
    console.log(`[Auto-Register] Student LRN ${studentLrn} not found for Critical Report. Creating placeholder student.`);
    await createStudent({
      lrn: studentLrn,
      firstName: "Pending",
      lastName: `Student (${studentLrn})`,
      gradeLevel: "Grade 7",
      section: "Pending",
      gender: "Male"
    });
  }

  const { data, error } = await supabase.from("critical_reports").insert([
    {
      student_lrn: studentLrn,
      date_of_incident: dateOfIncident,
      time_of_incident: timeOfIncident,
      issue: issue,
      description: description,
      action_taken: actionTaken,
      recommendation: recommendation,
      reported_by: reportedBy,
      date_reported: dateReported,
      record_status: recordStatus,
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
  if (error) {
    if (error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01") {
      console.error("Supabase getSections error:", error);
    }
    return [];
  }
  console.log("Supabase getSections data:", data);
  return data || [];
}

/**
 * Retrieve sections by grade level.
 */
export async function getSectionsByGradeLevel(gradeLevel: string): Promise<string[]> {
  console.log("getSectionsByGradeLevel called with:", gradeLevel);
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  
  // Try fetching with trimmed gradeLevel to handle potential whitespace issues
  const { data, error } = await supabase.from("sections").select("grade_level, section_name");
  
  if (error) {
    if (error.code !== "PGRST116" && error.code !== "PGRST205" && error.code !== "42P01") {
      console.error("Supabase sections error:", error);
    }
    return [];
  }
  
  // Filter client-side to be safer against data inconsistencies
  return (data || [])
    .filter(s => s.grade_level.trim().toLowerCase() === gradeLevel.trim().toLowerCase())
    .map(s => s.section_name);
}

/**
 * Save student report.
 */
export async function saveReport(report: any): Promise<any> {
  const supabase = getSupabaseClient();

  // Handle both camelCase, snake_case, and flat lowercase properties
  const studentLrn = String(report.studentLrn || report.student_lrn || report.studentlrn || "").trim();
  const dateOfIncident = report.dateOfIncident || report.date_of_incident || report.dateofincident || "";
  const timeOfIncident = report.timeOfIncident || report.time_of_incident || report.timeofincident || "";
  const issue = report.issue || "";
  const description = report.description || "";
  const actionTaken = report.actionTaken || report.action_taken || report.actiontaken || "";
  const recommendation = report.recommendation || "";
  const createdBy = report.createdBy || report.created_by || report.createdby || "";
  const reportedBy = report.reportedBy || report.reported_by || report.reportedby || "";
  const dateReported = report.dateReported || report.date_reported || report.datereported || new Date().toISOString();
  const individualFactors = report.individualFactors || report.individual_factors || report.individualfactors || [];
  const familyCommunityBehaviorFactors = report.familyCommunityBehaviorFactors || report.family_community_behavior_factors || report.familycommunitybehaviorfactors || [];
  const referralRecommendation = report.referralRecommendation || report.referral_recommendation || report.referralrecommendation || "";
  const initialAssessmentMadeBy = report.initialAssessmentMadeBy || report.initial_assessment_made_by || report.initialassessmentmadeby || "";
  const designation = report.designation || "";
  const recordStatus = report.recordStatus || report.record_status || report.recordstatus || 'On Going';

  if (!studentLrn) {
    throw new Error("Student LRN is required.");
  }

  // Ensure student exists in Supabase so the foreign key constraint is satisfied
  const existingStudent = await getStudentByLrn(studentLrn);
  if (!existingStudent) {
    console.log(`[Auto-Register] Student LRN ${studentLrn} not found for General/CICL Report. Creating placeholder student.`);
    await createStudent({
      lrn: studentLrn,
      firstName: "Pending",
      lastName: `Student (${studentLrn})`,
      gradeLevel: "Grade 7",
      section: "Pending",
      gender: "Male"
    });
  }

  const { data, error } = await supabase.from("reports").insert([
    {
      student_lrn: studentLrn,
      date_of_incident: dateOfIncident,
      time_of_incident: timeOfIncident,
      issue: issue,
      description: description,
      action_taken: actionTaken,
      recommendation: recommendation,
      created_at: new Date().toISOString(),
      created_by: createdBy,
      reported_by: reportedBy,
      date_reported: dateReported,
      individual_factors: individualFactors,
      family_community_behavior_factors: familyCommunityBehaviorFactors,
      referral_recommendation: referralRecommendation,
      initial_assessment_made_by: initialAssessmentMadeBy,
      designation: designation,
      record_status: recordStatus,
    },
  ]);
  if (error) {
    console.error("Supabase create report failure:", error);
    let userMsg = error.message;
    if (error.message.includes("column \"designation\" does not exist") || 
        error.message.includes("column \"individual_factors\" does not exist") ||
        error.message.includes("Could not find the 'designation' column")) {
      userMsg = "Database schema mismatch. Required columns (designation, etc.) are missing in your Supabase 'reports' table. Please click the DB Status button at the top and follow the 'Schema Fix' instructions.";
    }
    throw new Error(userMsg);
  }
  return data;
}

/**
 * Retrieve all student reports.
 */
export async function getAllReports(): Promise<Report[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from("reports").select("*").range(from, from + step - 1);
      if (error) {
        console.error("Supabase read reports failure:", error);
        return [];
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < step) {
          break;
        }
      } else {
        break;
      }
      from += step;
    }
    return allData.map((row: any) => ({
      id: row.id,
      studentLrn: row.student_lrn,
      dateOfIncident: row.date_of_incident,
      timeOfIncident: row.time_of_incident,
      issue: row.issue,
      description: row.description,
      actionTaken: row.action_taken,
      recommendation: row.recommendation,
      reportedBy: row.reported_by,
      dateReported: row.date_reported,
      lastUpdatedBy: row.last_updated_by,
      individualFactors: row.individual_factors || [],
      familyFactors: row.family_factors || [],
      schoolFactors: row.school_factors || [],
      communityFactors: row.community_factors || [],
      recordStatus: row.record_status,
      closureDate: row.closure_date,
    })) as any;
  } catch (err) {
    console.error("Supabase read reports exception:", err);
    return [];
  }
}

/**
 * Retrieve all critical student reports.
 */
export async function getAllCriticalReports(): Promise<CriticalReport[]> {
  const supabase = getSupabaseClient();
  if (!supabase) return [];
  try {
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from("critical_reports").select("*").range(from, from + step - 1);
      if (error) {
        console.error("Supabase read critical reports failure:", error);
        return [];
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < step) {
          break;
        }
      } else {
        break;
      }
      from += step;
    }
    return allData.map((row: any) => ({
      id: row.id,
      studentLrn: row.student_lrn,
      incidentDate: row.incident_date,
      incidentTime: row.incident_time,
      location: row.location,
      natureOfIncident: row.nature_of_incident,
      description: row.description,
      witnesses: row.witnesses,
      immediateActionTaken: row.immediate_action_taken,
      reportedBy: row.reported_by,
      dateReported: row.date_reported,
      lastUpdatedBy: row.last_updated_by,
      recordStatus: row.record_status,
      closureDate: row.closure_date,
    })) as any;
  } catch (err) {
    console.error("Supabase read critical reports exception:", err);
    return [];
  }
}

/**
 * Update report status.
 */
export async function updateReportStatus(
  id: number,
  status: string,
  type: 'General' | 'Critical',
  movFileUrl?: string,
  movFileName?: string,
  adminComment?: string
): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const table = type === 'Critical' ? 'critical_reports' : 'reports';

  let updateFields: any = { record_status: status };

  if (movFileUrl || adminComment) {
    // Fetch current action_taken so we don't lose it
    const { data, error: fetchError } = await supabase
      .from(table)
      .select("action_taken")
      .eq("id", id)
      .single();

    let newAction = "";
    if (!fetchError && data) {
      newAction = data.action_taken || "";
    }
    
    if (movFileUrl && movFileName) {
      const separator = newAction.trim() ? "\n\n" : "";
      newAction = `${newAction}${separator}[MOV File: ${movFileName}](${movFileUrl})`;
    }
    
    if (adminComment) {
      const separator = newAction.trim() ? "\n\n" : "";
      newAction = `${newAction}${separator}**Admin Comment:** ${adminComment}`;
    }
    
    updateFields.action_taken = newAction;
  }

  const { error } = await supabase.from(table).update(updateFields).eq("id", id);
  if (error) throw error;
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
    let allData: any[] = [];
    let from = 0;
    const step = 1000;
    while (true) {
      const { data, error } = await supabase.from("students").select("*").range(from, from + step - 1);
      if (error) {
        console.error("Supabase read students failure, falling back to local cache:", error);
        return loadLocalStudents();
      }
      if (data && data.length > 0) {
        allData = allData.concat(data);
        if (data.length < step) {
          break;
        }
      } else {
        break;
      }
      from += step;
    }
    return allData.map(mapSupabaseRowToStudent);
  } catch (err) {
    console.error("Supabase read students exception, falling back to local cache:", err);
    return loadLocalStudents();
  }
}

/**
 * Delete a single student report.
 */
export async function deleteReport(id: string | number): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from("reports").delete().eq("id", id);
  if (error) throw error;
}

/**
 * Update report recommendation.
 */
export async function updateReportRecommendation(id: string | number, recommendation: string, updatedBy: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from("reports").update({ 
    recommendation, 
    last_updated_by: updatedBy 
  }).eq("id", id);
  if (error) throw error;
}

/**
 * Update critical report recommendation.
 */
export async function updateCriticalReportRecommendation(id: string | number, recommendation: string, updatedBy: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from("critical_reports").update({ 
    recommendation, 
    last_updated_by: updatedBy 
  }).eq("id", id);
  if (error) throw error;
}

/**
 * Delete a single critical student report.
 */
export async function deleteCriticalReport(id: string | number): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  const { error } = await supabase.from("critical_reports").delete().eq("id", id);
  if (error) throw error;
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
 * Administrative: Update user role and section.
 */
export async function updateAdvisoryAssignment(email: string, role: string, gradeLevel: string | null, section: string | null): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;
  
  const targetEmail = email.trim().toLowerCase();

  // STRICT RULE: Only one adviser per section
  // If assigning as Adviser, demote any existing adviser in the same section
  if (role === 'Adviser' && gradeLevel && section) {
    const { data: existingAdvisers } = await supabase
      .from("users")
      .select("email")
      .eq("role", "Adviser")
      .eq("grade_level", gradeLevel)
      .eq("section", section)
      .neq("email", targetEmail);

    if (existingAdvisers && existingAdvisers.length > 0) {
      for (const adv of existingAdvisers) {
        await supabase
          .from("users")
          .update({
            role: "Non-Adviser",
            grade_level: null,
            section: null
          })
          .eq("email", adv.email);
      }
    }
  }

  const { error } = await supabase.from("users")
    .update({ 
      role, 
      grade_level: gradeLevel, 
      section: section 
    })
    .eq("email", targetEmail);
    
  if (error) {
    console.error("Supabase advisory update failure:", error);
    let userMsg = error.message;
    if (error.message.includes("column \"role\" does not exist") || 
        error.message.includes("column \"grade_level\" does not exist") || 
        error.message.includes("column \"section\" does not exist") ||
        error.message.includes("Could not find the 'role' column")) {
      userMsg = "Database schema mismatch. Some required columns (role, grade_level, section) are missing in your Supabase 'users' table. Please click the DB Status button at the top and follow the 'Schema Fix' instructions.";
    }
    throw new Error(userMsg);
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
export async function createStudent(student: any): Promise<void> {
  const normalizedStudent: Student = {
    lrn: String(student.lrn || "").trim(),
    lastName: student.lastName || student.last_name || "",
    firstName: student.firstName || student.first_name || "",
    middleName: student.middleName || student.middle_name || "",
    profilePictureUrl: student.profilePictureUrl || student.profile_picture_url || "",
    gradeLevel: student.gradeLevel || student.grade_level || "Grade 7",
    section: student.section || "",
    gender: student.gender || "Male",
    dateOfBirth: student.dateOfBirth || student.date_of_birth || "",
    heightCm: Number(student.heightCm || student.height_cm || 0),
    weightKg: Number(student.weightKg || student.weight_kg || 0),
    religion: student.religion || "",
    religionSpecify: student.religionSpecify || student.religion_specify || "",
    is4ps: student.is4ps || student.is_4ps || "No",
    isIndigenous: student.isIndigenous || student.is_indigenous || "No",
    fatherName: student.fatherName || student.father_name || "",
    fatherContact: student.fatherContact || student.father_contact || "",
    fatherIncome: student.fatherIncome || student.father_income || "",
    motherName: student.motherName || student.mother_name || "",
    motherContact: student.motherContact || student.mother_contact || "",
    motherIncome: student.motherIncome || student.mother_income || "",
    guardianName: student.guardianName || student.guardian_name || "",
    guardianRelationship: student.guardianRelationship || student.guardian_relationship || "",
    guardianContact: student.guardianContact || student.guardian_contact || "",
    guardianIncome: student.guardianIncome || student.guardian_income || "",
    siblingsCount: Number(student.siblingsCount || student.siblings_count || 0),
    siblingsBelow18: Number(student.siblingsBelow18 || student.siblings_below_18 || 0),
    ordinalOrder: student.ordinalOrder || student.ordinal_order || "",
    houseNumber: student.houseNumber || student.house_number || "",
    street: student.street || "",
    barangay: student.barangay || "",
    city: student.city || "",
    learningModality: student.learningModality || student.learning_modality || "Face-to-Face",
    internetConnectivity: student.internetConnectivity || student.internet_connectivity || "None",
    registeredAt: student.registeredAt || student.registered_at || new Date().toISOString(),
    registeredBy: student.registeredBy || student.registered_by || "",
  };

  // Always update local cache backup
  saveStudentLocally(normalizedStudent);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return;
  }

  try {
    const row = mapStudentToSupabaseRow(normalizedStudent);
    const { error } = await supabase.from("students").upsert(row, { onConflict: "lrn", ignoreDuplicates: true });
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
    const { error } = await supabase.from("students").upsert(rows, { onConflict: "lrn", ignoreDuplicates: true });
    if (error) {
      console.error("Supabase bulk upsert failed. Retrying upserts individually...", error);
      // Fallback: try individual upserts
      for (const student of students) {
        try {
          const row = mapStudentToSupabaseRow(student);
          const { error: indError } = await supabase.from("students").upsert(row, { onConflict: "lrn", ignoreDuplicates: true });
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

// ==========================================
// PERSISTENT NOTIFICATIONS SYSTEM (HYBRID)
// ==========================================
const NOTIFICATIONS_DB_PATH = path.join(LOCAL_DB_DIR, "notifications.json");

function getNotificationsLocally(): AppNotification[] {
  try {
    if (fs.existsSync(NOTIFICATIONS_DB_PATH)) {
      const data = fs.readFileSync(NOTIFICATIONS_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to read local notifications:", err);
  }
  return [];
}

function saveNotificationsLocally(notifications: AppNotification[]): void {
  try {
    if (!fs.existsSync(LOCAL_DB_DIR)) {
      fs.mkdirSync(LOCAL_DB_DIR, { recursive: true });
    }
    fs.writeFileSync(NOTIFICATIONS_DB_PATH, JSON.stringify(notifications, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save local notifications:", err);
  }
}

export async function saveNotification(notification: Omit<AppNotification, "id">): Promise<AppNotification> {
  const localList = getNotificationsLocally();
  const newId = localList.length > 0 ? Math.max(...localList.map(n => typeof n.id === "number" ? n.id : 0)) + 1 : 1;
  const newNotification: AppNotification = {
    ...notification,
    id: newId,
    isRead: false,
    readBy: []
  };

  localList.unshift(newNotification); // Newest first
  saveNotificationsLocally(localList);

  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("notifications").insert([
        {
          message: newNotification.message,
          type: newNotification.type,
          student_lrn: newNotification.studentLrn,
          student_name: newNotification.studentName,
          reported_by: newNotification.reportedBy,
          target_role: newNotification.targetRole,
          is_read: false,
          read_by: [],
          created_at: newNotification.createdAt
        }
      ]).select();
      if (!error && data && data.length > 0) {
        newNotification.id = data[0].id;
        const updatedLocal = getNotificationsLocally();
        const index = updatedLocal.findIndex(n => n.createdAt === newNotification.createdAt && n.message === newNotification.message);
        if (index !== -1) {
          updatedLocal[index].id = data[0].id;
          saveNotificationsLocally(updatedLocal);
        }
      } else {
        if (error && error.code !== "PGRST116" && error.code !== "42P01") {
          // console.warn("Supabase notification insert skipped or errored", error?.message);
        }
      }
    } catch (e: any) {
      console.error("Exception inserting notification to Supabase:", e.message);
    }
  }

  return newNotification;
}

export async function getAllNotifications(): Promise<AppNotification[]> {
  const localList = getNotificationsLocally();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localList;
  }
  try {
    const { data, error } = await supabase.from("notifications").select("*").order("created_at", { ascending: false });
    if (error) {
      if (error.code !== "PGRST116" && error.code !== "42P01") {
        console.warn("Failed to fetch notifications from Supabase, using local:", error.message);
      }
      return localList;
    }
    const mapped: AppNotification[] = (data || []).map((row: any) => ({
      id: row.id,
      message: row.message,
      type: row.type,
      studentLrn: row.student_lrn,
      studentName: row.student_name,
      reportedBy: row.reported_by,
      targetRole: row.target_role,
      isRead: row.is_read,
      readBy: Array.isArray(row.read_by) ? row.read_by : (typeof row.read_by === "string" ? JSON.parse(row.read_by) : []),
      createdAt: row.created_at
    }));

    saveNotificationsLocally(mapped);
    return mapped;
  } catch (err: any) {
    console.error("Exception fetching notifications from Supabase:", err.message);
    return localList;
  }
}

export async function markNotificationAsRead(id: string | number, userEmail: string): Promise<void> {
  const localList = getNotificationsLocally();
  const index = localList.findIndex(n => String(n.id) === String(id));
  if (index !== -1) {
    const n = localList[index];
    if (!n.readBy) n.readBy = [];
    if (!n.readBy.includes(userEmail)) {
      n.readBy.push(userEmail);
    }
    n.isRead = true;
    saveNotificationsLocally(localList);
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error: getError } = await supabase.from("notifications").select("read_by").eq("id", id).maybeSingle();
    if (!getError && data) {
      let currentReadBy: string[] = Array.isArray(data.read_by) ? data.read_by : (typeof data.read_by === "string" ? JSON.parse(data.read_by) : []);
      if (!currentReadBy.includes(userEmail)) {
        currentReadBy.push(userEmail);
      }
      await supabase.from("notifications").update({
        read_by: currentReadBy,
        is_read: true
      }).eq("id", id);
    } else {
      await supabase.from("notifications").update({
        read_by: [userEmail],
        is_read: true
      }).eq("id", id);
    }
  } catch (err: any) {
    console.error(`Failed to mark notification ${id} as read on Supabase:`, err.message);
  }
}

export async function markAllNotificationsAsRead(userEmail: string, targetRole: 'Guidance' | 'Admin'): Promise<void> {
  const localList = getNotificationsLocally();
  let changed = false;
  localList.forEach(n => {
    if (n.targetRole === targetRole || n.targetRole === 'All') {
      if (!n.readBy) n.readBy = [];
      if (!n.readBy.includes(userEmail)) {
        n.readBy.push(userEmail);
        n.isRead = true;
        changed = true;
      }
    }
  });
  if (changed) {
    saveNotificationsLocally(localList);
  }

  const supabase = getSupabaseClient();
  if (!supabase) return;

  try {
    const { data, error } = await supabase.from("notifications").select("id, read_by").eq("target_role", targetRole);
    if (!error && data) {
      for (const item of data) {
        let currentReadBy: string[] = Array.isArray(item.read_by) ? item.read_by : (typeof item.read_by === "string" ? JSON.parse(item.read_by) : []);
        if (!currentReadBy.includes(userEmail)) {
          currentReadBy.push(userEmail);
          await supabase.from("notifications").update({
            read_by: currentReadBy,
            is_read: true
          }).eq("id", item.id);
        }
      }
    }
  } catch (err: any) {
    console.error("Failed to mark all notifications as read on Supabase:", err.message);
  }
}

export async function clearNotifications(): Promise<void> {
  saveNotificationsLocally([]);
  const supabase = getSupabaseClient();
  if (!supabase) return;
  try {
    const { error } = await supabase.from("notifications").delete().neq("id", 0);
    if (error && error.code !== "PGRST116" && error.code !== "42P01") {
      console.error("Failed to clear notifications in Supabase:", error.message);
    }
  } catch (err: any) {
    console.error("Exception clearing notifications in Supabase:", err.message);
  }
}

export async function getStudentByLrn(lrn: string): Promise<Student | null> {
  const supabase = getSupabaseClient();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("students").select("*").eq("lrn", lrn).maybeSingle();
      if (!error && data) {
        return mapSupabaseRowToStudent(data);
      }
    } catch (e) {}
  }
  try {
    const STUDENTS_DB_PATH = path.join(LOCAL_DB_DIR, "students.json");
    if (fs.existsSync(STUDENTS_DB_PATH)) {
      const data = fs.readFileSync(STUDENTS_DB_PATH, "utf-8");
      const list: Student[] = JSON.parse(data);
      const student = list.find(s => s.lrn.trim() === lrn.trim());
      if (student) return student;
    }
  } catch (e) {}
  return null;
}

/**
 * Uploads a base64 encoded file to Supabase Storage 'MOVs' bucket.
 * Returns the public URL of the uploaded file.
 */
export async function uploadFileToSupabaseStorage(
  base64Data: string,
  fileName: string,
  mimeType: string,
  bucket: string = "uploads"
): Promise<{ fileName: string; publicUrl: string }> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error("Supabase client is not initialized.");
  }

  const timestamp = Date.now();
  const cleanFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
  const uniqueFileName = `${timestamp}_${cleanFileName}`;

  const buffer = Buffer.from(base64Data, "base64");

  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(uniqueFileName, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) {
    console.error(`Supabase Storage upload error details (${bucket}):`, error);
    throw error;
  }

  // Get public URL
  const { data: publicUrlData } = supabase.storage
    .from(bucket)
    .getPublicUrl(uniqueFileName);

  if (!publicUrlData || !publicUrlData.publicUrl) {
    throw new Error("Failed to generate public URL for uploaded file.");
  }

  return {
    fileName: uniqueFileName,
    publicUrl: publicUrlData.publicUrl,
  };
}

// ==========================================
// SIGNATORY SETTINGS DATABASE OPERATIONS
// ==========================================

import { SignatorySettings } from "../src/types";

const SIGNATORIES_DB_PATH = path.join(LOCAL_DB_DIR, "signatory_settings.json");

function mapSupabaseRowToSignatorySettings(row: any): SignatorySettings {
  return {
    id: row.id,
    preparedByName: row.prepared_by_name || "",
    preparedByPosition: row.prepared_by_position || "",
    notedByName: row.noted_by_name || "",
    notedByPosition: row.noted_by_position || "",
    approvedByName: row.approved_by_name || "",
    approvedByPosition: row.approved_by_position || "",
    updatedAt: row.updated_at || ""
  };
}

function mapSignatorySettingsToSupabaseRow(s: SignatorySettings) {
  return {
    id: 1, // Single settings row
    prepared_by_name: s.preparedByName || "",
    prepared_by_position: s.preparedByPosition || "",
    noted_by_name: s.notedByName || "",
    noted_by_position: s.notedByPosition || "",
    approved_by_name: s.approvedByName || "",
    approved_by_position: s.approvedByPosition || "",
    updated_at: s.updatedAt || new Date().toISOString()
  };
}

export function getSignatorySettingsLocally(): SignatorySettings {
  try {
    if (fs.existsSync(SIGNATORIES_DB_PATH)) {
      const data = fs.readFileSync(SIGNATORIES_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load local signatory settings:", err);
  }
  return {
    preparedByName: "",
    preparedByPosition: "",
    notedByName: "",
    notedByPosition: "",
    approvedByName: "",
    approvedByPosition: ""
  };
}

export function saveSignatorySettingsLocally(settings: SignatorySettings): void {
  try {
    fs.writeFileSync(SIGNATORIES_DB_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save local signatory settings:", err);
  }
}

export async function getSignatorySettings(): Promise<SignatorySettings> {
  const localSettings = getSignatorySettingsLocally();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localSettings;
  }

  try {
    const { data, error } = await supabase
      .from("signatory_settings")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST116" && error.code !== "PGRST205" && !error.message?.includes("does not exist") && error.code !== "42P01") {
        console.error("Supabase getSignatorySettings error:", error);
      }
      return localSettings;
    }

    if (data) {
      const mapped = mapSupabaseRowToSignatorySettings(data);
      saveSignatorySettingsLocally(mapped);
      return mapped;
    } else {
      return localSettings;
    }
  } catch (err) {
    console.error("Supabase getSignatorySettings exception:", err);
    return localSettings;
  }
}

export async function saveSignatorySettings(settings: SignatorySettings): Promise<SignatorySettings> {
  const updatedWithTime = {
    ...settings,
    updatedAt: new Date().toISOString()
  };

  saveSignatorySettingsLocally(updatedWithTime);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return updatedWithTime;
  }

  try {
    const row = mapSignatorySettingsToSupabaseRow(updatedWithTime);
    const { error } = await supabase.from("signatory_settings").upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (error) {
      console.error("Supabase saveSignatorySettings failure:", error);
    } else {
      console.log("✅ Signatory settings successfully saved to Supabase.");
    }
  } catch (err) {
    console.error("Supabase saveSignatorySettings exception:", err);
  }

  return updatedWithTime;
}




// ==========================================
// ADMIN PASSWORDS OPERATIONS
// ==========================================

import { AdminPasswords } from "../src/types";

const ADMIN_PASSWORDS_DB_PATH = path.join(LOCAL_DB_DIR, "admin_passwords.json");

export function getAdminPasswordsLocally(): AdminPasswords {
  try {
    if (fs.existsSync(ADMIN_PASSWORDS_DB_PATH)) {
      const data = fs.readFileSync(ADMIN_PASSWORDS_DB_PATH, "utf-8");
      return JSON.parse(data);
    }
  } catch (err) {
    console.error("Failed to load local admin passwords:", err);
  }
  return {
    clearReports: "NoMoreReporting",
    clearStudents: "VacationTime",
    deleteTeacher: "HolidayTime"
  };
}

export function saveAdminPasswordsLocally(settings: AdminPasswords): void {
  try {
    fs.writeFileSync(ADMIN_PASSWORDS_DB_PATH, JSON.stringify(settings, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to save local admin passwords:", err);
  }
}

export async function getAdminPasswords(): Promise<AdminPasswords> {
  const localSettings = getAdminPasswordsLocally();
  const supabase = getSupabaseClient();
  if (!supabase) {
    return localSettings;
  }

  try {
    const { data, error } = await supabase
      .from("admin_passwords")
      .select("*")
      .eq("id", 1)
      .maybeSingle();

    if (error) {
      if (error.code !== "PGRST116" && error.code !== "PGRST205" && !error.message?.includes("does not exist") && error.code !== "42P01") {
        console.error("Supabase getAdminPasswords error:", error);
      }
      return localSettings;
    }

    if (data) {
      const mapped = {
        clearReports: data.clear_reports || "NoMoreReporting",
        clearStudents: data.clear_students || "VacationTime",
        deleteTeacher: data.delete_teacher || "HolidayTime"
      };
      saveAdminPasswordsLocally(mapped);
      return mapped;
    } else {
      return localSettings;
    }
  } catch (err) {
    console.error("Supabase getAdminPasswords exception:", err);
    return localSettings;
  }
}

export async function saveAdminPasswords(settings: AdminPasswords): Promise<AdminPasswords> {
  saveAdminPasswordsLocally(settings);

  const supabase = getSupabaseClient();
  if (!supabase) {
    return settings;
  }

  try {
    const row = {
      id: 1,
      clear_reports: settings.clearReports,
      clear_students: settings.clearStudents,
      delete_teacher: settings.deleteTeacher
    };
    const { error } = await supabase.from("admin_passwords").upsert(row, { onConflict: "id", ignoreDuplicates: true });
    if (error) {
      console.error("Supabase saveAdminPasswords failure:", error);
    }
  } catch (err) {
    console.error("Supabase saveAdminPasswords exception:", err);
  }
  return settings;
}
