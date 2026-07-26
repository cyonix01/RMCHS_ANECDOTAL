/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import * as path from "path";
import * as fs from "fs";
import * as crypto from "crypto";
import { createServer as createViteServer } from "vite";
import { Readable } from "stream";
import dotenv from "dotenv";

dotenv.config({ override: true });
import { 
  initDatabase, 
  getUserByEmail, 
  createUser, 
  updateUser, 
  getDatabaseStatus,
  saveSupabaseConfig,
  getAllStudents,
  createStudent,
  createStudentsBulk,
  searchStudents,
  saveReport,
  getAllReports,
  saveCriticalReport,
  getAllCriticalReports,
  updateReportStatus,
  getSections,
  getSectionsByGradeLevel,
  getSupabaseClient,
  clearAllReports,
  clearAllStudents,
  deleteUser,
  updateAdvisoryAssignment,
  deleteReport,
  deleteCriticalReport,
  updateReportRecommendation,
  updateCriticalReportRecommendation,
  createSection,
  updateSection,
  deleteSection,
  saveNotification,
  getAllNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  clearNotifications,
  getStudentByLrn,
  updateStudentPhoto,
  uploadFileToSupabaseStorage,
  uploadFileToGoogleDrive,
  getSignatorySettings,
  getAdminPasswords,
  saveAdminPasswords,
  saveSignatorySettings,
  saveAuditLog,
  getAuditLogs
} from "./server/database";
import { UserAccount, Student, AppNotification, AuditLog } from "./src/types";

// Hash utility
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

// IP extraction helper
function getClientIp(req: express.Request): string {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    const raw = Array.isArray(forwarded) ? forwarded[0] : forwarded;
    const first = raw.split(",")[0].trim();
    if (first) return first;
  }
  return req.socket?.remoteAddress || req.ip || "127.0.0.1";
}

// Audit log helper with automatic IP capture
function logAudit(req: express.Request, entry: Omit<AuditLog, "id" | "timestamp">) {
  return saveAuditLog({
    ipAddress: getClientIp(req),
    ...entry
  });
}

// Helper to parse arrays from flexible formats
function parseFlexibleArray(field: any): string[] {
  if (Array.isArray(field)) {
    return field.map(String);
  }
  if (typeof field === "string") {
    const trimmed = field.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed.map(String);
        }
      } catch (e) {}
    }
    return trimmed.split(",").map(s => s.trim()).filter(Boolean);
  }
  return [];
}

// Helper to normalize general reports (handles camelCase, snake_case, and lowercase keys)
function normalizeGeneralReport(body: any): any {
  if (!body || typeof body !== "object") return {};
  
  const studentLrn = String(body.studentLrn ?? body.student_lrn ?? body.studentlrn ?? "").trim();
  const dateOfIncident = String(body.dateOfIncident ?? body.date_of_incident ?? body.dateofincident ?? "");
  const timeOfIncident = String(body.timeOfIncident ?? body.time_of_incident ?? body.timeofincident ?? "");
  const issue = String(body.issue ?? "");
  const description = String(body.description ?? "");
  const actionTaken = String(body.actionTaken ?? body.action_taken ?? body.actiontaken ?? "");
  const recommendation = String(body.recommendation ?? "");
  
  const individualFactors = parseFlexibleArray(body.individualFactors ?? body.individual_factors ?? body.individualfactors);
  const familyCommunityBehaviorFactors = parseFlexibleArray(body.familyCommunityBehaviorFactors ?? body.family_community_behavior_factors ?? body.familycommunitybehaviorfactors);
  
  const referralRecommendation = String(body.referralRecommendation ?? body.referral_recommendation ?? body.referralrecommendation ?? "");
  const initialAssessmentMadeBy = String(body.initialAssessmentMadeBy ?? body.initial_assessment_made_by ?? body.initialassessmentmadeby ?? "");
  const designation = String(body.designation ?? "");
  const recordStatus = String(body.recordStatus ?? body.record_status ?? body.recordstatus ?? "On Going");
  const createdBy = String(body.createdBy ?? body.created_by ?? body.createdby ?? "");
  const reportedBy = String(body.reportedBy ?? body.reported_by ?? body.reportedby ?? "");
  const dateReported = String(body.dateReported ?? body.date_reported ?? body.datereported ?? new Date().toISOString());
  
  return {
    studentLrn,
    dateOfIncident,
    timeOfIncident,
    issue,
    description,
    actionTaken,
    recommendation,
    individualFactors,
    familyCommunityBehaviorFactors,
    referralRecommendation,
    initialAssessmentMadeBy,
    designation,
    recordStatus,
    createdBy,
    reportedBy,
    dateReported
  };
}

// Helper to normalize critical reports
function normalizeCriticalReport(body: any): any {
  if (!body || typeof body !== "object") return {};
  
  const studentLrn = String(body.studentLrn ?? body.student_lrn ?? body.studentlrn ?? "").trim();
  const dateOfIncident = String(body.dateOfIncident ?? body.date_of_incident ?? body.dateofincident ?? "");
  const timeOfIncident = String(body.timeOfIncident ?? body.time_of_incident ?? body.timeofincident ?? "");
  const issue = String(body.issue ?? "");
  const description = String(body.description ?? "");
  const actionTaken = String(body.actionTaken ?? body.action_taken ?? body.actiontaken ?? "");
  const recommendation = String(body.recommendation ?? "");
  const reportedBy = String(body.reportedBy ?? body.reported_by ?? body.reportedby ?? "");
  const dateReported = String(body.dateReported ?? body.date_reported ?? body.datereported ?? new Date().toISOString());
  const recordStatus = String(body.recordStatus ?? body.record_status ?? body.recordstatus ?? "On Going");
  
  return {
    studentLrn,
    dateOfIncident,
    timeOfIncident,
    issue,
    description,
    actionTaken,
    recommendation,
    reportedBy,
    dateReported,
    recordStatus
  };
}



function saveFileLocally(base64Data: string, fileName: string): { fileName: string; fileUrl: string } {
  const uploadDir = path.join(process.cwd(), "data", "uploads");
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  const timestamp = Date.now();
  const safeFileName = `${timestamp}_${fileName.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = path.join(uploadDir, safeFileName);
  
  const buffer = Buffer.from(base64Data, "base64");
  fs.writeFileSync(filePath, buffer);
  
  return {
    fileName: safeFileName,
    fileUrl: `/uploads/${safeFileName}`
  };
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // Serve local uploads statically
  app.use("/uploads", express.static(path.join(process.cwd(), "data", "uploads")));

  // Initialize spreadsheet/local data folder setup asynchronously so it doesn't block server startup
  initDatabase().catch(err => {
    console.error("Background database initialization failed:", err);
  });

  // API ROUTE 1: Check Database Configuration Status
  app.get("/api/db-status", (req, res) => {
    const status: any = getDatabaseStatus();
    status.google_env_keys = Object.keys(process.env).filter(k => k.startsWith("GOOGLE"));
    res.json(status);
  });

  // API ROUTE: Get Signatory Settings
  app.get("/api/signatories", async (req, res) => {
    try {
      const settings = await getSignatorySettings();
      res.json(settings);
    } catch (err: any) {
      console.error("Failed to load signatory settings:", err);
      res.status(500).json({ error: err.message || "Failed to load signatory settings" });
    }
  });

  // API ROUTE: Generic Upload (Google Drive / Supabase / Local Fallback)
  app.post("/api/upload", async (req, res) => {
    try {
      const { file, folderId } = req.body;
      if (!file || !file.base64) {
        return res.status(400).json({ error: "File data is required." });
      }

      let savedFileUrl: string | undefined = undefined;
      let uploadWarning: string | null = null;
      const targetFolderId = folderId || "1Z4yhxeX8q1as5cInrQByxnszhSJp5t5Y";

      try {
        console.log(`[UPLOAD] Attempting Google Drive upload for '${file.name}' to folder '${targetFolderId}'...`);
        const driveUpload = await uploadFileToGoogleDrive(
          file.base64,
          file.name,
          file.mimeType || "image/jpeg",
          targetFolderId
        );
        savedFileUrl = driveUpload.publicUrl;
      } catch (driveErr: any) {
        console.warn(`[UPLOAD] Google Drive upload failed: ${driveErr.message}. Falling back to Supabase Storage / Local...`);
        try {
          const uploaded = await uploadFileToSupabaseStorage(file.base64, file.name, file.mimeType, 'id-pictures');
          savedFileUrl = uploaded.publicUrl || "";
          uploadWarning = `Saved to Supabase storage. Google Drive upload message: ${driveErr.message}`;
        } catch (supaErr: any) {
          console.warn(`[UPLOAD] Supabase Storage upload failed, using local storage fallback...`);
          try {
            const localFile = saveFileLocally(file.base64, file.name);
            savedFileUrl = localFile.fileUrl;
            uploadWarning = `Saved locally. Google Drive and Supabase storage uploads were unavailable.`;
          } catch (localErr: any) {
            throw new Error(`Upload failed on all targets (Google Drive, Supabase, Local).`);
          }
        }
      }

      res.json({ url: savedFileUrl, warning: uploadWarning });
    } catch (err: any) {
      console.error("Upload error:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/signatories", async (req, res) => {
    try {
      const settings = req.body;
      const saved = await saveSignatorySettings(settings);

      await logAudit(req, {
        action: 'UPDATE_SIGNATORY_SETTINGS',
        performedBy: String(req.headers['x-user-email'] || settings.updatedBy || 'Admin'),
        targetId: 'SIGNATORIES',
        targetName: 'Signatory Settings',
        details: `Updated signatory configuration (Prepared: ${settings.preparedByName || 'N/A'}, Noted: ${settings.notedByName || 'N/A'})`
      });

      res.json(saved);
    } catch (err: any) {
      console.error("Failed to save signatory settings:", err);
      res.status(500).json({ error: err.message || "Failed to save signatory settings" });
    }
  });

  // API ROUTE 1.05: Diagnose Supabase Storage Bucket Access
  app.get("/api/diagnose-storage", async (req, res) => {
    const diagnosticLog: string[] = [];
    const log = (...args: any[]) => {
      const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(" ");
      console.log("[STORAGE-DIAGNOSIS]", msg);
      diagnosticLog.push(msg);
    };

    log("Starting Supabase Storage bucket ('MOVs') diagnostic test...");
    try {
      const supabase = getSupabaseClient();
      if (!supabase) {
        throw new Error("Supabase client is not initialized. Please verify your Supabase URL and Anon Key configurations.");
      }

      log("Supabase client successfully initialized.");
      log("Checking if 'MOVs' bucket exists and is accessible...");
      
      const { data: bucket, error: bucketError } = await supabase.storage.getBucket('MOVs');
      
      if (bucketError) {
        log("Failed to find or access 'MOVs' bucket.");
        throw bucketError;
      }

      log("Successfully found 'MOVs' bucket. Metadata:");
      log(bucket);

      log("Listing files in 'MOVs' bucket to test read access permissions...");
      const { data: files, error: filesError } = await supabase.storage.from('MOVs').list('', { limit: 5 });

      if (filesError) {
        log("Successfully accessed bucket, but failed to list files (likely a policy or permission issue).");
        throw filesError;
      }

      log(`Successfully listed ${files ? files.length : 0} file(s) in 'MOVs' bucket.`);
      log("DIAGNOSTIC TEST SUCCESSFUL!");

      res.json({
        success: true,
        bucket,
        filesCount: files ? files.length : 0,
        logs: diagnosticLog
      });
    } catch (err: any) {
      log("DIAGNOSTIC TEST FAILED!");
      const errorObj = {
        message: err.message || String(err),
        code: err.code,
        status: err.status,
        details: err.details
      };
      log("Error details:");
      log(errorObj);
      
      res.status(200).json({
        success: false,
        error: errorObj,
        logs: diagnosticLog
      });
    }
  });

  // API ROUTE 1.6: Update Custom Supabase Configurations
  app.post("/api/save-supabase", async (req, res) => {
    try {
      const { url, anonKey } = req.body;
      if (!url || typeof url !== "string" || url.trim() === "") {
        return res.status(400).json({ error: "A valid Supabase URL is required." });
      }
      if (!anonKey || typeof anonKey !== "string" || anonKey.trim() === "") {
        return res.status(400).json({ error: "A valid Supabase Public Anon Key is required." });
      }

      saveSupabaseConfig(url.trim(), anonKey.trim());
      // Re-initialize connections using the new Supabase config
      await initDatabase();

      await logAudit(req, {
        action: 'CONFIGURE_DATABASE',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: 'SUPABASE_CONFIG',
        targetName: 'Supabase Connection',
        details: `Updated Supabase endpoint URL: ${url.trim()}`
      });

      res.json({ status: "ok", message: "Supabase credentials updated successfully!" });
    } catch (err: any) {
      console.error("Failed to update Supabase configurations:", err);
      res.status(500).json({ error: `Failed to update Supabase: ${err.message}` });
    }
  });

  // API ROUTE 1.1: Get All Users
  app.get("/api/users", async (req, res) => {
    try {
      const { getAllUsers } = await import("./server/database");
      const users = await getAllUsers();
      res.json(users);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 1.2: Update Advisory Assignment
  app.put("/api/users/:email/advisory", async (req, res) => {
    try {
      const { email } = req.params;
      const { role, gradeLevel, section } = req.body;
      const targetUser = await getUserByEmail(email);
      const oldRole = targetUser?.role || 'Unknown';
      const oldGrade = targetUser?.gradeLevel || 'None';
      const oldSection = targetUser?.section || 'None';

      await updateAdvisoryAssignment(email, role, gradeLevel, section);

      const performedBy = req.body.adminEmail || req.headers['x-user-email'] || 'Admin';
      await logAudit(req, {
        action: 'ASSIGN_ADVISORY',
        performedBy: String(performedBy),
        targetId: email,
        targetName: targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : email,
        details: `Updated advisory role to ${role}${role === 'Adviser' ? ` (${gradeLevel} - ${section})` : ''}`,
        previousValues: { role: oldRole, gradeLevel: oldGrade, section: oldSection },
        newValues: { role, gradeLevel, section }
      });

      res.json({ message: "Advisory assignment updated successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 2: Register New User Account
  app.post("/api/register", async (req, res) => {
    try {
      const { 
        firstName, 
        middleName, 
        lastName, 
        email, 
        contactNumber, 
        department, 
        position, 
        role,
        password 
      } = req.body;

      // Server-side strict input validation
      if (!firstName || !lastName || !email || !contactNumber || !department || !position || !role || !password) {
        return res.status(400).json({ error: "All fields are required (Middle Name is optional but field must be specified)." });
      }

      const emailTrim = email.trim().toLowerCase();
      // Regular expression for validating the email structure
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(emailTrim)) {
        return res.status(400).json({ error: "Invalid email format." });
      }

      // Contact numbers check (numbers only)
      if (!/^\d+$/.test(contactNumber)) {
        return res.status(400).json({ error: "Contact number must consist of digits only." });
      }

      // Check if email already registered as user
      const existingUser = await getUserByEmail(emailTrim);
      if (existingUser) {
        return res.status(400).json({ error: "Username/Email is already registered." });
      }

      // Create secure SHA-256 hash
      const passwordHash = hashPassword(password);

      const newUser: UserAccount = {
        firstName: firstName.trim(),
        middleName: (middleName || "").trim(),
        lastName: lastName.trim(),
        email: emailTrim,
        contactNumber: contactNumber,
        department: department,
        position: position,
        passwordHash,
        registeredAt: new Date().toISOString(),
        role: role // Role from request body
      };

      await createUser(newUser);

      await logAudit(req, {
        action: 'REGISTER_TEACHER',
        performedBy: emailTrim,
        targetId: emailTrim,
        targetName: `${firstName.trim()} ${lastName.trim()}`,
        details: `Registered new teacher account as ${role} (${department} - ${position})`,
        newValues: { firstName: firstName.trim(), lastName: lastName.trim(), email: emailTrim, role, department, position }
      });

      // Return user context without actual passwordHash leak
      const { passwordHash: _, ...authenticatedUser } = newUser;
      res.status(201).json({ 
        message: "Registration successful!", 
        user: authenticatedUser 
      });
    } catch (err: any) {
      console.error("Registration endpoint crashed:", err);
      res.status(500).json({ error: `Internal registration fault: ${err.message}` });
    }
  });

  // API ROUTE 3: Authenticate / Login User Account
  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required." });
      }

      const emailTrim = email.trim().toLowerCase();
      const user = await getUserByEmail(emailTrim);

      if (!user) {
        return res.status(401).json({ error: "Incorrect email/username or password." });
      }

      const enteredHash = hashPassword(password);
      if (user.passwordHash !== enteredHash) {
        return res.status(401).json({ error: "Incorrect email/username or password." });
      }

      // Do not transmit hash
      const { passwordHash: _, ...authenticatedUser } = user;

      await logAudit(req, {
        action: 'USER_LOGIN',
        performedBy: emailTrim,
        targetId: emailTrim,
        targetName: `${user.firstName} ${user.lastName}`,
        details: `User logged into portal as ${user.role} (${user.department} - ${user.position})`
      });

      res.json({
        message: "Login successful!",
        user: authenticatedUser
      });
    } catch (err: any) {
      console.error("Login endpoint crashed:", err);
      res.status(500).json({ error: `Internal authentication fault: ${err.message}` });
    }
  });

  // API ROUTE 3.5: Forgot Password Recovery & Reset (Legacy - keep for compatibility if needed or replace)
  // Replaced by 3.6 and 3.7

  // Store verification codes in memory
  const resetCodes = new Map<string, { code: string, expiresAt: number }>();

  // API ROUTE 3.6: Request Password Reset Code
  app.post("/api/forgot-password-request", async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required to send verification code." });
      }

      const emailTrim = email.trim().toLowerCase();
      const user = await getUserByEmail(emailTrim);

      if (!user) {
        // Return 404 so UI knows it's invalid
        return res.status(404).json({ error: "Username/Email is not registered in the system." });
      }

      // Generate a 6-digit code
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Expire in 15 minutes
      const expiresAt = Date.now() + 15 * 60 * 1000;
      resetCodes.set(emailTrim, { code, expiresAt });

      console.log(`\n=========================================`);
      console.log(`[MOCK EMAIL] To: ${emailTrim}`);
      console.log(`[MOCK EMAIL] Subject: Password Reset Verification Code`);
      console.log(`[MOCK EMAIL] Body: Your verification code is ${code}. It expires in 15 minutes.`);
      console.log(`=========================================\n`);

      res.json({ 
        message: "Verification code has been sent to your email.",
        devCode: process.env.NODE_ENV !== "production" ? code : undefined 
      });
    } catch (err: any) {
      console.error("Forgot password request crashed:", err);
      res.status(500).json({ error: `Internal error: ${err.message}` });
    }
  });

  // API ROUTE 3.7: Verify Code and Reset Password
  app.post("/api/reset-password-verify", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code, and new password are required." });
      }

      const emailTrim = email.trim().toLowerCase();
      const user = await getUserByEmail(emailTrim);

      if (!user) {
        return res.status(404).json({ error: "User not found." });
      }

      const stored = resetCodes.get(emailTrim);
      if (!stored) {
        return res.status(400).json({ error: "No verification code requested or it has expired." });
      }

      if (Date.now() > stored.expiresAt) {
        resetCodes.delete(emailTrim);
        return res.status(400).json({ error: "Verification code has expired. Please request a new one." });
      }

      if (stored.code !== code.trim()) {
        return res.status(400).json({ error: "Invalid verification code." });
      }

      // Create secure SHA-256 hash of new password
      const newHash = hashPassword(newPassword);
      await updateUser(emailTrim, { passwordHash: newHash });

      // Clean up code
      resetCodes.delete(emailTrim);

      await logAudit(req, {
        action: 'RESET_PASSWORD',
        performedBy: emailTrim,
        targetId: emailTrim,
        targetName: `${user.firstName} ${user.lastName}`,
        details: `Password reset verified and changed for account ${emailTrim}`
      });

      res.json({
        message: "Your passcode has been successfully recovered and updated! Please log in with your new passcode."
      });
    } catch (err: any) {
      console.error("Reset password verify crashed:", err);
      res.status(500).json({ error: `Internal recovery fault: ${err.message}` });
    }
  });

  // API ROUTE 4: Update Personal Profile Details & Password
  app.post("/api/update-profile", async (req, res) => {
    try {
      const {
        email,
        firstName,
        middleName,
        lastName,
        contactNumber,
        department,
        position,
        role,
        gradeLevel,
        section,
        currentPassword,
        newPassword
      } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Unauthorized operation: email was not supplied." });
      }

      const user = await getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ error: "User profile was not found." });
      }

      // 1. Password confirmation check (mandatory for updates to guarantee safety)
      if (!currentPassword) {
        return res.status(400).json({ error: "Current password is required to verify changes." });
      }
      if (hashPassword(currentPassword) !== user.passwordHash) {
        return res.status(403).json({ error: "Authentication failed. Current password is incorrect." });
      }

      // Validation parameters checks
      if (!firstName || !lastName || !contactNumber || !department || !position || !role) {
        return res.status(400).json({ error: "Required fields cannot be empty." });
      }

      if (role === 'Adviser' && (!gradeLevel || !section)) {
        return res.status(400).json({ error: "Grade Level and Section are required for Advisers." });
      }

      if (!/^\d+$/.test(contactNumber)) {
        return res.status(400).json({ error: "Contact number must consist of digits only." });
      }

      // Build updated dataset
      const updatedFields: Partial<UserAccount> = {
        firstName: firstName.trim(),
        middleName: (middleName || "").trim(),
        lastName: lastName.trim(),
        contactNumber: contactNumber,
        department: department,
        position: position,
        role,
        gradeLevel: role === 'Adviser' ? gradeLevel : undefined,
        section: role === 'Adviser' ? section : undefined
      };

      // If user wants to alter their password
      if (newPassword && newPassword.trim() !== "") {
        updatedFields.passwordHash = hashPassword(newPassword);
      }

      const freshProfile = await updateUser(email, updatedFields);
      
      // Calculate changed fields for audit log
      const changedList: string[] = [];
      if (user.firstName !== updatedFields.firstName) changedList.push(`First Name: "${user.firstName}" → "${updatedFields.firstName}"`);
      if (user.lastName !== updatedFields.lastName) changedList.push(`Last Name: "${user.lastName}" → "${updatedFields.lastName}"`);
      if (user.contactNumber !== updatedFields.contactNumber) changedList.push(`Contact: "${user.contactNumber}" → "${updatedFields.contactNumber}"`);
      if (user.department !== updatedFields.department) changedList.push(`Department: "${user.department}" → "${updatedFields.department}"`);
      if (user.position !== updatedFields.position) changedList.push(`Position: "${user.position}" → "${updatedFields.position}"`);
      if (user.role !== updatedFields.role) changedList.push(`Role: "${user.role}" → "${updatedFields.role}"`);
      if (user.gradeLevel !== updatedFields.gradeLevel) changedList.push(`Grade Level: "${user.gradeLevel || 'None'}" → "${updatedFields.gradeLevel || 'None'}"`);
      if (user.section !== updatedFields.section) changedList.push(`Section: "${user.section || 'None'}" → "${updatedFields.section || 'None'}"`);
      if (newPassword && newPassword.trim() !== "") changedList.push("Password updated");

      const auditDetails = changedList.length > 0 
        ? `Updated fields: ${changedList.join(", ")}` 
        : "Profile saved with no field changes";

      await logAudit(req, {
        action: 'UPDATE_TEACHER_PROFILE',
        performedBy: email,
        targetId: email,
        targetName: `${freshProfile.firstName} ${freshProfile.lastName}`,
        details: auditDetails,
        previousValues: {
          firstName: user.firstName,
          lastName: user.lastName,
          contactNumber: user.contactNumber,
          department: user.department,
          position: user.position,
          role: user.role,
          gradeLevel: user.gradeLevel,
          section: user.section
        },
        newValues: {
          firstName: freshProfile.firstName,
          lastName: freshProfile.lastName,
          contactNumber: freshProfile.contactNumber,
          department: freshProfile.department,
          position: freshProfile.position,
          role: freshProfile.role,
          gradeLevel: freshProfile.gradeLevel,
          section: freshProfile.section
        }
      });

      const { passwordHash: _, ...userSafeDetails } = freshProfile;
      res.json({
        message: "Profile updated successfully!",
        user: userSafeDetails
      });
    } catch (err: any) {
      console.error("Update profile exception:", err);
      res.status(500).json({ error: `Failure updating profile details: ${err.message}` });
    }
  });

  // API ROUTE 5: Get All Registered Students
  app.get("/api/students", async (req, res) => {
    try {
      const students = await getAllStudents();
      res.json(students);
    } catch (err: any) {
      console.error("Failed to fetch students list:", err);
      res.status(500).json({ error: `Failed to fetch students: ${err.message}` });
    }
  });

  // API ROUTE 5.5: Search Students
  app.get("/api/students/search", async (req, res) => {
    try {
      const { query } = req.query;
      if (!query || typeof query !== "string") {
        return res.status(400).json({ error: "Search query is required." });
      }
      const students = await searchStudents(query);
      res.json(students);
    } catch (err: any) {
      console.error("Failed to search students:", err);
      res.status(500).json({ error: `Search failed: ${err.message}` });
    }
  });

  // API ROUTE 6: Register Individual Student
  app.post("/api/students/register", async (req, res) => {
    try {
      const student: Student = req.body;
      if (!student.lrn || !student.firstName || !student.lastName) {
        return res.status(400).json({ error: "LRN, First Name and Last Name are required." });
      }
      
      const existingStudent = await getStudentByLrn(student.lrn);
      await createStudent(student);

      const isUpdate = !!existingStudent;
      const performedBy = student.registeredBy || req.headers['x-user-email'] || 'Adviser';

      await logAudit(req, {
        action: isUpdate ? 'UPDATE_STUDENT_PROFILE' : 'REGISTER_STUDENT',
        performedBy: String(performedBy),
        targetId: student.lrn,
        targetName: `${student.firstName} ${student.lastName}`,
        details: isUpdate 
          ? `Updated student profile for ${student.firstName} ${student.lastName} (LRN: ${student.lrn}, ${student.gradeLevel} - ${student.section})`
          : `Registered student profile for ${student.firstName} ${student.lastName} (LRN: ${student.lrn}, ${student.gradeLevel} - ${student.section})`,
        previousValues: existingStudent ? {
          firstName: existingStudent.firstName,
          lastName: existingStudent.lastName,
          gradeLevel: existingStudent.gradeLevel,
          section: existingStudent.section,
          guardianName: existingStudent.guardianName,
          guardianContact: existingStudent.guardianContact
        } : undefined,
        newValues: {
          firstName: student.firstName,
          lastName: student.lastName,
          gradeLevel: student.gradeLevel,
          section: student.section,
          guardianName: student.guardianName,
          guardianContact: student.guardianContact
        }
      });

      res.status(201).json({ status: "ok", message: isUpdate ? "Student profile updated successfully!" : "Student registered successfully!" });
    } catch (err: any) {
      console.error("Failed to register student:", err);
      res.status(500).json({ error: `Registration error: ${err.message}` });
    }
  });

  // API ROUTE 6.5: Update Student Photo
  app.put("/api/students/:lrn/photo", async (req, res) => {
    try {
      const { lrn } = req.params;
      const { profilePictureUrl, file, updatedBy } = req.body;
      let targetUrl = profilePictureUrl;

      if (file && file.base64) {
        const fileName = file.name || `student_${lrn}_photo.jpg`;
        const mimeType = file.mimeType || "image/jpeg";
        const folderId = "1Z4yhxeX8q1as5cInrQByxnszhSJp5t5Y";

        try {
          console.log(`[STUDENT PHOTO] Attempting Google Drive upload to folder ${folderId} for student LRN ${lrn}...`);
          const driveUpload = await uploadFileToGoogleDrive(
            file.base64,
            fileName,
            mimeType,
            folderId
          );
          targetUrl = driveUpload.publicUrl;
        } catch (driveErr: any) {
          console.warn(`[STUDENT PHOTO] Google Drive upload failed (${driveErr.message}), trying Supabase Storage...`);
          try {
            const uploaded = await uploadFileToSupabaseStorage(
              file.base64,
              fileName,
              mimeType,
              "id-pictures"
            );
            targetUrl = uploaded.publicUrl;
          } catch (supaErr: any) {
            console.warn("[STUDENT PHOTO] Supabase Storage failed, saving locally...", supaErr);
            const localFile = saveFileLocally(file.base64, fileName);
            targetUrl = localFile.fileUrl;
          }
        }
      }

      if (!targetUrl) {
        return res.status(400).json({ error: "Profile picture URL or file is required." });
      }

      await updateStudentPhoto(lrn, targetUrl);

      const existingStudent = await getStudentByLrn(lrn);
      const studentName = existingStudent ? `${existingStudent.firstName} ${existingStudent.lastName}` : `Student LRN ${lrn}`;
      const performedBy = updatedBy || req.headers['x-user-email'] || 'User';

      await logAudit(req, {
        action: 'UPDATE_STUDENT_PHOTO',
        performedBy: String(performedBy),
        targetId: lrn,
        targetName: studentName,
        details: `Updated ID profile picture link for student ${studentName} (LRN: ${lrn})`
      });

      console.log(`[STUDENT PHOTO] Updated student ${lrn} photo link permanently in database: ${targetUrl}`);
      res.json({ status: "ok", message: "Student photo updated permanently in database!", url: targetUrl });
    } catch (err: any) {
      console.error("Failed to update student photo:", err);
      res.status(500).json({ error: `Failed to update student photo: ${err.message}` });
    }
  });

  // Helper to process report attachments
  async function processReportAttachment(filePayload: any): Promise<{ url: string; name: string } | null> {
    if (!filePayload || !filePayload.base64) return null;
    try {
      const uploaded = await uploadFileToSupabaseStorage(filePayload.base64, filePayload.name, filePayload.mimeType || 'application/octet-stream', 'MOVs');
      return { url: uploaded.publicUrl, name: uploaded.fileName || filePayload.name };
    } catch (uploadErr) {
      try {
        const localFile = saveFileLocally(filePayload.base64, filePayload.name);
        return { url: localFile.fileUrl, name: filePayload.name };
      } catch (localErr) {
        console.error("Local file save error:", localErr);
        return null;
      }
    }
  }

  // API ROUTE 7: Save Report
  app.post("/api/reports", async (req, res) => {
    try {
      const report = normalizeGeneralReport(req.body);

      if (req.body.file && req.body.file.base64) {
        const attachResult = await processReportAttachment(req.body.file);
        if (attachResult) {
          const sep = report.actionTaken ? "\n\n" : "";
          report.actionTaken = `${report.actionTaken || ''}${sep}[MOV File: ${attachResult.name}](${attachResult.url})`;
        }
      }

      await saveReport(report);

      const student = await getStudentByLrn(report.studentLrn);
      const studentName = student ? `${student.firstName} ${student.lastName}` : `Student (LRN: ${report.studentLrn})`;

      await logAudit(req, {
        action: 'CREATE_REPORT',
        performedBy: String(report.reportedBy || req.headers['x-user-email'] || 'User'),
        targetId: report.studentLrn,
        targetName: studentName,
        details: `Filed General Incident Report (${report.issue}) for ${studentName} on ${report.dateOfIncident || 'today'}`
      });

      try {
        const ciclOffensesList = ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"];
        const isCicl = ciclOffensesList.includes(report.issue);

        // Always notify Guidance
        await saveNotification({
          message: isCicl 
            ? `New CICL Report received: ${studentName} - ${report.issue}` 
            : `New General Report received: ${studentName} - ${report.issue}`,
          type: isCicl ? 'CICL' : 'General',
          studentLrn: report.studentLrn,
          studentName: studentName,
          reportedBy: report.reportedBy,
          targetRole: 'Guidance',
          createdAt: new Date().toISOString()
        });

        // Notify Admin for CICL report
        if (isCicl) {
          await saveNotification({
            message: `New CICL Report received: ${studentName} - ${report.issue}`,
            type: 'CICL',
            studentLrn: report.studentLrn,
            studentName: studentName,
            reportedBy: report.reportedBy,
            targetRole: 'Admin',
            createdAt: new Date().toISOString()
          });
        }
      } catch (notifErr: any) {
        console.error("Failed to dispatch notifications for general/cicl report:", notifErr.message);
      }

      res.status(201).json({ message: "Report saved successfully" });
    } catch (err: any) {
      console.error("Failed to save report:", err);
      res.status(500).json({ error: `Report saving failed: ${err.message}` });
    }
  });

  // API ROUTE 7.1: Get All Reports
  app.get("/api/reports", async (req, res) => {
    try {
      const reports = await getAllReports();
      res.json(reports);
    } catch (err: any) {
      console.error("Failed to fetch reports:", err);
      res.status(500).json({ error: `Failed to fetch reports: ${err.message}` });
    }
  });

  // API ROUTE 7.2: Delete Single Report
  app.delete("/api/reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteReport(id);

      await logAudit(req, {
        action: 'DELETE_REPORT',
        performedBy: String(req.headers['x-user-email'] || req.query.deletedBy || 'User'),
        targetId: String(id),
        targetName: `Report #${id}`,
        details: `Deleted General Incident Report #${id}`
      });

      res.json({ message: "Report deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 7.3: Update Report Recommendation
  app.put("/api/reports/:id/recommendation", async (req, res) => {
    try {
      const { id } = req.params;
      const { recommendation, updatedBy } = req.body;
      await updateReportRecommendation(id, recommendation, updatedBy);

      await logAudit(req, {
        action: 'UPDATE_RECOMMENDATION',
        performedBy: String(updatedBy || req.headers['x-user-email'] || 'Guidance'),
        targetId: String(id),
        targetName: `Report #${id}`,
        details: `Updated Guidance recommendation for Report #${id}: "${recommendation}"`
      });

      res.json({ message: "Recommendation updated successfully" });
    } catch (err: any) {
      console.error("Failed to update report recommendation:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 7.4: Update Report Status
  app.put("/api/reports/:id/status", async (req, res) => {
    try {
      const { id } = req.params;
      const { status, type, file, adminComment, updatedBy } = req.body;

      let driveUploadWarning: string | null = null;
      let driveFile: any = null;
      let savedFileUrl: string | undefined = undefined;
      let savedFileName: string | undefined = undefined;

      if (file && file.base64) {
        try {
          console.log(`[MOV-UPLOAD] Attempting to upload '${file.name}' to Supabase Storage.`);
          const uploaded = await uploadFileToSupabaseStorage(file.base64, file.name, file.mimeType, 'MOVs');
          savedFileUrl = uploaded.publicUrl || "";
          savedFileName = uploaded.fileName || file.name;
          // Set driveFile for backwards compatibility with the client success link
          driveFile = { webViewLink: savedFileUrl };
          console.log(`[MOV-UPLOAD] Upload successful! PublicUrl: ${savedFileUrl}`);
        } catch (uploadErr: any) {
          console.error("Failed to upload MOV to Supabase Storage:", uploadErr);
          const errMsg = uploadErr.message || String(uploadErr);
          console.warn(`Supabase Storage upload failed (${errMsg}). Falling back to local server storage.`);
          
          try {
            const localFile = saveFileLocally(file.base64, file.name);
            savedFileUrl = localFile.fileUrl;
            savedFileName = file.name;
            driveFile = { webViewLink: savedFileUrl };
            driveUploadWarning = `Supabase upload failed (${errMsg}). File successfully saved to Local Server Storage instead!`;
          } catch (localErr: any) {
            console.error("Local storage fallback failed after Supabase upload failed:", localErr);
            driveUploadWarning = `Supabase upload failed (${errMsg}) and Local Storage also failed (${localErr.message})`;
          }
        }
      }

      let finalStatus = status;

      await updateReportStatus(Number(id), finalStatus, type, savedFileUrl, savedFileName, adminComment);

      await logAudit(req, {
        action: 'UPDATE_REPORT_STATUS',
        performedBy: String(updatedBy || req.headers['x-user-email'] || 'User'),
        targetId: String(id),
        targetName: `Report #${id}`,
        details: `Changed status for ${type || 'General'} Report #${id} to "${finalStatus}"${adminComment ? ` (Comment: "${adminComment}")` : ''}${savedFileName ? ` with MOV "${savedFileName}"` : ''}`
      });

      res.json({ message: "Status updated successfully", warning: driveUploadWarning, driveFile, savedFileUrl });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 7.5: Save Critical Report
  app.post("/api/critical-reports", async (req, res) => {
    try {
      const report = normalizeCriticalReport(req.body);

      if (req.body.file && req.body.file.base64) {
        const attachResult = await processReportAttachment(req.body.file);
        if (attachResult) {
          const sep = report.actionTaken ? "\n\n" : "";
          report.actionTaken = `${report.actionTaken || ''}${sep}[MOV File: ${attachResult.name}](${attachResult.url})`;
        }
      }

      await saveCriticalReport(report);

      const student = await getStudentByLrn(report.studentLrn);
      const studentName = student ? `${student.firstName} ${student.lastName}` : `Student (LRN: ${report.studentLrn})`;

      await logAudit(req, {
        action: 'CREATE_CRITICAL_REPORT',
        performedBy: String(report.reportedBy || req.headers['x-user-email'] || 'User'),
        targetId: report.studentLrn,
        targetName: studentName,
        details: `Filed Critical Incident Report (${report.issue}) for ${studentName} on ${report.dateOfIncident || 'today'}`
      });

      try {
        // Always notify Guidance
        await saveNotification({
          message: `New Critical Report received: ${studentName} - ${report.issue}`,
          type: 'Critical',
          studentLrn: report.studentLrn,
          studentName: studentName,
          reportedBy: report.reportedBy,
          targetRole: 'Guidance',
          createdAt: new Date().toISOString()
        });

        // Notify Admin
        await saveNotification({
          message: `New Critical Report received: ${studentName} - ${report.issue}`,
          type: 'Critical',
          studentLrn: report.studentLrn,
          studentName: studentName,
          reportedBy: report.reportedBy,
          targetRole: 'Admin',
          createdAt: new Date().toISOString()
        });
      } catch (notifErr: any) {
        console.error("Failed to dispatch notifications for critical report:", notifErr.message);
      }

      res.status(201).json({ message: "Critical report saved successfully" });
    } catch (err: any) {
      console.error("Failed to save critical report:", err);
      res.status(500).json({ error: `Critical report saving failed: ${err.message}` });
    }
  });

  // API ROUTE 7.6: Get All Critical Reports
  app.get("/api/critical-reports", async (req, res) => {
    try {
      const reports = await getAllCriticalReports();
      res.json(reports);
    } catch (err: any) {
      console.error("Failed to fetch critical reports:", err);
      res.status(500).json({ error: `Failed to fetch critical reports: ${err.message}` });
    }
  });

  // API ROUTE 7.7: Delete Single Critical Report
  app.delete("/api/critical-reports/:id", async (req, res) => {
    try {
      const { id } = req.params;
      await deleteCriticalReport(id);

      await logAudit(req, {
        action: 'DELETE_CRITICAL_REPORT',
        performedBy: String(req.headers['x-user-email'] || 'User'),
        targetId: String(id),
        targetName: `Critical Report #${id}`,
        details: `Deleted Critical Incident Report #${id}`
      });

      res.json({ message: "Critical report deleted successfully" });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 7.8: Update Critical Report Recommendation
  app.put("/api/critical-reports/:id/recommendation", async (req, res) => {
    try {
      const { id } = req.params;
      const { recommendation, updatedBy } = req.body;
      await updateCriticalReportRecommendation(id, recommendation, updatedBy);

      await logAudit(req, {
        action: 'UPDATE_RECOMMENDATION',
        performedBy: String(updatedBy || req.headers['x-user-email'] || 'Guidance'),
        targetId: String(id),
        targetName: `Critical Report #${id}`,
        details: `Updated Guidance recommendation for Critical Report #${id}: "${recommendation}"`
      });

      res.json({ message: "Recommendation updated successfully" });
    } catch (err: any) {
      console.error("Failed to update critical report recommendation:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 15: Get All Notifications
  app.get("/api/notifications", async (req, res) => {
    try {
      const list = await getAllNotifications();
      res.json(list);
    } catch (err: any) {
      console.error("Failed to fetch notifications:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 16: Mark Single Notification as Read
  app.post("/api/notifications/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "User email is required to mark notification as read." });
      }
      await markNotificationAsRead(id, email);
      res.json({ message: "Notification marked as read successfully" });
    } catch (err: any) {
      console.error("Failed to mark notification as read:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 17: Mark All Notifications as Read for Role
  app.post("/api/notifications/read-all", async (req, res) => {
    try {
      const { email, role } = req.body;
      if (!email || !role) {
        return res.status(400).json({ error: "Email and role are required." });
      }
      await markAllNotificationsAsRead(email, role);
      res.json({ message: "All notifications marked as read successfully" });
    } catch (err: any) {
      console.error("Failed to mark all notifications as read:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 18: Clear All Notifications
  app.delete("/api/notifications", async (req, res) => {
    try {
      await clearNotifications();
      res.json({ message: "Notifications cleared successfully" });
    } catch (err: any) {
      console.error("Failed to clear notifications:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 8: Get Sections by Grade Level
  app.get("/api/sections", async (req, res) => {
    try {
      const { gradeLevel } = req.query;
      if (gradeLevel && typeof gradeLevel === "string") {
        const sections = await getSectionsByGradeLevel(gradeLevel);
        return res.json(sections);
      }
      // If no gradeLevel, maybe return all? Or error.
      // For now, let's keep it consistent with the UI's needs.
      res.status(400).json({ error: "Grade Level is required." });
    } catch (err: any) {
      console.error("Failed to fetch sections:", err);
      res.status(500).json({ error: `Failed to fetch sections: ${err.message}` });
    }
  });

  // API ROUTE 8.1: Get All Sections
  app.get("/api/sections/all", async (req, res) => {
    try {
      const sections = await getSections();
      res.json(sections);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

    // ADMIN API: Admin Passwords
  app.get("/api/admin/passwords", async (req, res) => {
    try {
      const email = req.headers['x-user-email'] as string;
      if (email) {
        const user = await getUserByEmail(email);
        if (user && user.role !== 'Admin') {
          return res.status(403).json({ error: "Access denied: Admin role required." });
        }
      }
      const passwords = await getAdminPasswords();
      res.json(passwords);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/passwords", async (req, res) => {
    try {
      const email = req.headers['x-user-email'] as string;
      if (email) {
        const user = await getUserByEmail(email);
        if (user && user.role !== 'Admin') {
          return res.status(403).json({ error: "Access denied: Admin role required." });
        }
      }
      const newPasswords = req.body;
      const saved = await saveAdminPasswords(newPasswords);

      await logAudit(req, {
        action: 'UPDATE_ADMIN_PASSWORDS',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: 'ADMIN_PASSWORDS',
        targetName: 'Admin Passwords',
        details: 'Updated administrative master security passwords'
      });

      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Clear Reports
  app.delete("/api/admin/clear-reports", async (req, res) => {
    try {
      const { password } = req.query;
      const passwords = await getAdminPasswords();
      if (password !== passwords.clearReports) {
        return res.status(401).json({ error: "Invalid password." });
      }
      await clearAllReports();

      await logAudit(req, {
        action: 'CLEAR_ALL_REPORTS',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: 'ALL_REPORTS',
        targetName: 'All Incident Reports',
        details: 'Admin reset clearing all general and critical student reports'
      });

      res.json({ message: "All reports cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Clear Students
  app.delete("/api/admin/clear-students", async (req, res) => {
    try {
      const { password } = req.query;
      const passwords = await getAdminPasswords();
      if (password !== passwords.clearStudents) {
        return res.status(401).json({ error: "Invalid password." });
      }
      await clearAllStudents();

      await logAudit(req, {
        action: 'CLEAR_ALL_STUDENTS',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: 'ALL_STUDENTS',
        targetName: 'All Students Roster',
        details: 'Admin reset clearing all registered student records'
      });

      res.json({ message: "All students cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Delete Teacher Account
  app.delete("/api/admin/delete-teacher", async (req, res) => {
    try {
      const { email } = req.query;
      if (!email || typeof email !== "string") {
        return res.status(400).json({ error: "Email is required." });
      }
      const targetUser = await getUserByEmail(email);
      await deleteUser(email);

      await logAudit(req, {
        action: 'DELETE_TEACHER',
        performedBy: req.headers['x-user-email'] as string || 'Admin',
        targetId: email,
        targetName: targetUser ? `${targetUser.firstName} ${targetUser.lastName}` : email,
        details: `Deleted teacher account (${email}, Role: ${targetUser?.role || 'Unknown'}, Dept: ${targetUser?.department || 'Unknown'})`
      });

      res.json({ message: `User ${email} deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Get System Audit Logs
  app.get("/api/admin/audit-logs", async (req, res) => {
    try {
      const logs = await getAuditLogs();
      res.json(logs);
    } catch (err: any) {
      console.error("Failed to fetch audit logs:", err);
      res.status(500).json({ error: `Failed to fetch audit logs: ${err.message}` });
    }
  });

  // ADMIN API: Add Section
  app.post("/api/admin/sections", async (req, res) => {
    try {
      const { gradeLevel, name } = req.body;
      if (!gradeLevel || !name) {
        return res.status(400).json({ error: "Grade level and name are required." });
      }
      await createSection(gradeLevel, name);

      await logAudit(req, {
        action: 'CREATE_SECTION',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: `${gradeLevel}_${name}`,
        targetName: `${gradeLevel} - ${name}`,
        details: `Created academic section ${gradeLevel} - ${name}`
      });

      res.status(201).json({ message: "Section added." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Update Section
  app.put("/api/admin/sections", async (req, res) => {
    try {
      const { oldGrade, oldName, newGrade, newName } = req.body;
      await updateSection(oldGrade, oldName, newGrade, newName);

      await logAudit(req, {
        action: 'UPDATE_SECTION',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: `${newGrade}_${newName}`,
        targetName: `${newGrade} - ${newName}`,
        details: `Updated section "${oldGrade} - ${oldName}" to "${newGrade} - ${newName}"`
      });

      res.json({ message: "Section updated." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ADMIN API: Delete Section
  app.delete("/api/admin/sections", async (req, res) => {
    try {
      const { gradeLevel, name } = req.query;
      if (!gradeLevel || !name || typeof gradeLevel !== "string" || typeof name !== "string") {
        return res.status(400).json({ error: "Grade level and name are required." });
      }
      await deleteSection(gradeLevel, name);

      await logAudit(req, {
        action: 'DELETE_SECTION',
        performedBy: String(req.headers['x-user-email'] || 'Admin'),
        targetId: `${gradeLevel}_${name}`,
        targetName: `${gradeLevel} - ${name}`,
        details: `Deleted academic section ${gradeLevel} - ${name}`
      });

      res.json({ message: "Section deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // API ROUTE 9: Seed Sections (Temporary - would ideally be done via migration)
  app.post("/api/sections/seed", async (req, res) => {
    try {
      const supabase = getSupabaseClient();
      const sections = [
        { grade: "Grade 7", name: "STE- Eduardo San Juan" },
        { grade: "Grade 7", name: "STE-Casimiro del Rosario" },
        { grade: "Grade 7", name: "STE- Josette Biyo" },
        { grade: "Grade 7", name: "STE-Arturo Alcaraz" },
        { grade: "Grade 7", name: "SPA- Lamberto V. Avellana" },
        { grade: "Grade 7", name: "SPA- Aamado V. Hernandez" },
        { grade: "Grade 7", name: "Diamond" },
        { grade: "Grade 7", name: "Pearl" },
        { grade: "Grade 7", name: "Topaz" },
        { grade: "Grade 7", name: "Amethyst" },
        { grade: "Grade 7", name: "Beryl" },
        { grade: "Grade 7", name: "Citrine" },
        { grade: "Grade 7", name: "Diopside" },
        { grade: "Grade 7", name: "Emerald" },
        { grade: "Grade 7", name: "Fluorite" },
        { grade: "Grade 8", name: "STE- Fe Del Mundo" },
        { grade: "Grade 8", name: "STE-Pedro Escuro" },
        { grade: "Grade 8", name: "STE- Angel Alcala" },
        { grade: "Grade 8", name: "SPA- Fernando Amorsolo" },
        { grade: "Grade 8", name: "SPA- Lino Brocka" },
        { grade: "Grade 8", name: "SPA- Guillermo Tolentino" },
        { grade: "Grade 8", name: "Sampaguita" },
        { grade: "Grade 8", name: "Allium" },
        { grade: "Grade 8", name: "Anthurium" },
        { grade: "Grade 8", name: "Begonia" },
        { grade: "Grade 8", name: "Calla Lily" },
        { grade: "Grade 8", name: "Carnation" },
        { grade: "Grade 8", name: "Cattleya" },
        { grade: "Grade 8", name: "Daisy" },
        { grade: "Grade 9", name: "STE _Alfredo A. Santos" },
        { grade: "Grade 9", name: "STE_Julian A. Banzon" },
        { grade: "Grade 9", name: "STE_Anacleto Del Rosario" },
        { grade: "Grade 9", name: "SPA_Lucrecia Kasilag" },
        { grade: "Grade 9", name: "SPA_Levi Celerio" },
        { grade: "Grade 9", name: "Rizal" },
        { grade: "Grade 9", name: "Bonifacio" },
        { grade: "Grade 9", name: "Mabini" },
        { grade: "Grade 9", name: "Aquino, Melchora (Abad Santos)" },
        { grade: "Grade 9", name: "Baltazar, Francisco (Agoncillo)" },
        { grade: "Grade 9", name: "Del Pilar, Gregorio (Alvarez)" },
        { grade: "Grade 9", name: "Felipe, Julian (Aquino)" },
        { grade: "Grade 9", name: "Jacinto, Emilio (Arellano)" },
        { grade: "Grade 9", name: "Luna, Antonio (Baltazar)" },
        { grade: "Grade 10", name: "Gregorio Zara" },
        { grade: "Grade 10", name: "Francisco Quisumbing" },
        { grade: "Grade 10", name: "Wilfrido Ma. Guerrero" },
        { grade: "Grade 10", name: "Narra" },
        { grade: "Grade 10", name: "Molave" },
        { grade: "Grade 10", name: "Kamagong" },
        { grade: "Grade 10", name: "Acacia" },
        { grade: "Grade 10", name: "Banaba (Aguho)" },
        { grade: "Grade 10", name: "Camachile (Almaciga)" },
        { grade: "Grade 10", name: "Dao" },
        { grade: "Grade 11", name: "Archimedes(STEM)" },
        { grade: "Grade 11", name: "Descartes (STEM)" },
        { grade: "Grade 11", name: "Diocles (STEM)" },
        { grade: "Grade 11", name: "Eudoxus (STEM)" },
        { grade: "Grade 11", name: "Hypatia (STEM)" },
        { grade: "Grade 11", name: "Handel (ASSH)" },
        { grade: "Grade 11", name: "Mozart (ASSH)" },
        { grade: "Grade 11", name: "Beethoven (ASSH)" },
        { grade: "Grade 11", name: "Edison (ABM)" },
        { grade: "Grade 11", name: "Jobs (ABM)" },
        { grade: "Grade 11", name: "Schubert (ASSH)" },
        { grade: "Grade 11", name: "Tesla (STEM)" },
        { grade: "Grade 12", name: "STEM Aristotle" },
        { grade: "Grade 12", name: "STEM Socrates" },
        { grade: "Grade 12", name: "STEM Dalton" },
        { grade: "Grade 12", name: "STEM Euclid" },
        { grade: "Grade 12", name: "STEM Democritus" },
        { grade: "Grade 12", name: "ABM Gray" },
        { grade: "Grade 12", name: "ABM Fayol" },
        { grade: "Grade 12", name: "HUMSS Michelangelo" },
        { grade: "Grade 12", name: "HUMSS Botticelli" },
        { grade: "Grade 12", name: "HUMSS Da Vinci" },
        { grade: "Grade 12", name: "HUMSS Picasso" }
      ];

      for (const section of sections) {
        await supabase.from("sections").insert({ grade_level: section.grade, section_name: section.name });
      }
      res.status(201).json({ message: "Sections seeded successfully" });
    } catch (err: any) {
      console.error("Failed to seed sections:", err);
      res.status(500).json({ error: `Failed to seed sections: ${err.message}` });
    }
  });

  // API ROUTE 7: Bulk Register Students
  app.post("/api/students/bulk-register", async (req, res) => {
    try {
      const { students, registeredBy } = req.body;
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: "A non-empty list of students is required." });
      }
      const outcome = await createStudentsBulk(students);

      await logAudit(req, {
        action: 'BULK_REGISTER_STUDENTS',
        performedBy: String(registeredBy || req.headers['x-user-email'] || 'Adviser/Admin'),
        targetId: `BULK_${Date.now()}`,
        targetName: `Bulk Import (${students.length} Records)`,
        details: `Imported roster batch: ${outcome.successCount} of ${students.length} student records registered successfully.`
      });

      res.json({
        status: "ok",
        message: `Processed bulk registration! Successfully registered ${outcome.successCount} of ${students.length} students.`,
        errors: outcome.errors
      });
    } catch (err: any) {
      console.error("Failed to bulk register students:", err);
      res.status(500).json({ error: `Bulk registration failed: ${err.message}` });
    }
  });

  // Enable static client hosting / Vite loading depending on build target
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Teacher Portal backend active on http://0.0.0.0:${PORT}`);
  });
}

startServer();
