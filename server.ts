/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from "express";
import * as path from "path";
import * as crypto from "crypto";
import { createServer as createViteServer } from "vite";
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
  getSectionsByGradeLevel,
  getSupabaseClient
} from "./server/database";
import { UserAccount, Student } from "./src/types";

// Hash utility
function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // Initialize spreadsheet/local data folder setup asynchronously so it doesn't block server startup
  initDatabase().catch(err => {
    console.error("Background database initialization failed:", err);
  });

  // API ROUTE 1: Check Database Configuration Status
  app.get("/api/db-status", (req, res) => {
    res.json(getDatabaseStatus());
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

      res.json({ status: "ok", message: "Supabase credentials updated successfully!" });
    } catch (err: any) {
      console.error("Failed to update Supabase configurations:", err);
      res.status(500).json({ error: `Failed to update Supabase: ${err.message}` });
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
        password 
      } = req.body;

      // Server-side strict input validation
      if (!firstName || !lastName || !email || !contactNumber || !department || !position || !password) {
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
        role: 'Adviser'
      };

      await createUser(newUser);

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
      res.json({
        message: "Login successful!",
        user: authenticatedUser
      });
    } catch (err: any) {
      console.error("Login endpoint crashed:", err);
      res.status(500).json({ error: `Internal authentication fault: ${err.message}` });
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
      await createStudent(student);
      res.status(201).json({ status: "ok", message: "Student registered successfully!" });
    } catch (err: any) {
      console.error("Failed to register student:", err);
      res.status(500).json({ error: `Registration error: ${err.message}` });
    }
  });

  // API ROUTE 7: Save Report
  app.post("/api/reports", async (req, res) => {
    try {
      const report = req.body;
      await saveReport(report);
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

  // API ROUTE 7.5: Save Critical Report
  app.post("/api/critical-reports", async (req, res) => {
    try {
      const report = req.body;
      await saveCriticalReport(report);
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

  // API ROUTE 8: Get Sections by Grade Level
  app.get("/api/sections", async (req, res) => {
    try {
      const { gradeLevel } = req.query;
      if (!gradeLevel || typeof gradeLevel !== "string") {
        return res.status(400).json({ error: "Grade Level is required." });
      }
      const sections = await getSectionsByGradeLevel(gradeLevel);
      console.log(`Fetching sections for ${gradeLevel}:`, sections);
      res.json(sections);
    } catch (err: any) {
      console.error("Failed to fetch sections:", err);
      res.status(500).json({ error: `Failed to fetch sections: ${err.message}` });
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
      const { students } = req.body;
      if (!Array.isArray(students) || students.length === 0) {
        return res.status(400).json({ error: "A non-empty list of students is required." });
      }
      const outcome = await createStudentsBulk(students);
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
