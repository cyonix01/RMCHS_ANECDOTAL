const fs = require('fs');

let serverCode = fs.readFileSync('server.ts', 'utf8');

const importRegex = /import {[\s\S]*?getSignatorySettings,[\s\S]*?} from "\.\/server\/database";/;

// Just append the getAdminPasswords, saveAdminPasswords into the import list if they are not there, or we can just replace
if (serverCode.match(importRegex)) {
  serverCode = serverCode.replace('getSignatorySettings,', 'getSignatorySettings,\n  getAdminPasswords,\n  saveAdminPasswords,');
} else {
  // Try another replace
  serverCode = serverCode.replace('import {', 'import {\n  getAdminPasswords,\n  saveAdminPasswords,');
}


// Replace clear-reports
const clearReportsTarget = `  // ADMIN API: Clear Reports
  app.delete("/api/admin/clear-reports", async (req, res) => {
    try {
      await clearAllReports();
      res.json({ message: "All reports cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

const clearReportsNew = `  // ADMIN API: Clear Reports
  app.delete("/api/admin/clear-reports", async (req, res) => {
    try {
      const { password } = req.query;
      const passwords = await getAdminPasswords();
      if (password !== passwords.clearReports) {
        return res.status(401).json({ error: "Invalid password." });
      }
      await clearAllReports();
      res.json({ message: "All reports cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;
serverCode = serverCode.replace(clearReportsTarget, clearReportsNew);

// Replace clear-students
const clearStudentsTarget = `  // ADMIN API: Clear Students
  app.delete("/api/admin/clear-students", async (req, res) => {
    try {
      await clearAllStudents();
      res.json({ message: "All students cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

const clearStudentsNew = `  // ADMIN API: Clear Students
  app.delete("/api/admin/clear-students", async (req, res) => {
    try {
      const { password } = req.query;
      const passwords = await getAdminPasswords();
      if (password !== passwords.clearStudents) {
        return res.status(401).json({ error: "Invalid password." });
      }
      await clearAllStudents();
      res.json({ message: "All students cleared." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;
serverCode = serverCode.replace(clearStudentsTarget, clearStudentsNew);


// Replace delete-teacher
const deleteTeacherTarget = `  // ADMIN API: Delete Teacher Account
  app.delete("/api/admin/delete-teacher", async (req, res) => {
    try {
      const email = req.query.email as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }
      await deleteUserByEmail(email);
      res.json({ message: "Teacher account deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;

const deleteTeacherNew = `  // ADMIN API: Delete Teacher Account
  app.delete("/api/admin/delete-teacher", async (req, res) => {
    try {
      const email = req.query.email as string;
      const password = req.query.password as string;
      if (!email) {
        return res.status(400).json({ error: "Email is required." });
      }
      
      const passwords = await getAdminPasswords();
      if (password !== passwords.deleteTeacher) {
        return res.status(401).json({ error: "Invalid password." });
      }

      await deleteUserByEmail(email);
      res.json({ message: "Teacher account deleted." });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });`;
serverCode = serverCode.replace(deleteTeacherTarget, deleteTeacherNew);

// Add passwords API
const apiRouteString = `  // ADMIN API: Admin Passwords
  app.get("/api/admin/passwords", async (req, res) => {
    try {
      const passwords = await getAdminPasswords();
      res.json(passwords);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post("/api/admin/passwords", async (req, res) => {
    try {
      const newPasswords = req.body;
      const saved = await saveAdminPasswords(newPasswords);
      res.json(saved);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

`;

serverCode = serverCode.replace('// ADMIN API: Clear Reports', apiRouteString + '// ADMIN API: Clear Reports');

fs.writeFileSync('server.ts', serverCode);

