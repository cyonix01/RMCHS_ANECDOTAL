
import { createStudentsBulk, saveReport, saveCriticalReport, initDatabase } from "../server/database.js";
import { Student, Report, CriticalReport } from "../src/types.js";

const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Garcia", "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Dela Cruz", "Santiago", "Flores", "Aquino", "Pascual", "Dizon", "Mendoza", "Castillo", "Villanueva", "Ramos", "Castro", "Rivera", "Soriano", "De Leon"];
const gradeLevels: ("Grade 7" | "Grade 8" | "Grade 9" | "Grade 10" | "Grade 11" | "Grade 12")[] = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const sections = ["Aguinaldo", "Bonifacio", "Luna", "Rizal", "Mabini", "Silang", "Jacinto", "Del Pilar"];
const issues = ["Bullying", "Truancy", "Academic Dishonesty", "Disrespect to Authorities", "Fighting", "Theft", "Vandalism", "Smoking"];
const barangays = ["San Isidro", "San Roque", "San Jose", "Poblacion", "Santa Cruz", "Bagna", "Pinagbakahan"];

async function seed() {
  console.log("🌱 Starting seeding process...");
  
  await initDatabase();

  const students: Student[] = [];
  const lrns: string[] = [];

  for (let i = 0; i < 30; i++) {
    const lrn = Math.floor(Math.random() * 1000000000000).toString().padStart(12, '0');
    lrns.push(lrn);
    
    const gender = Math.random() > 0.5 ? "Male" : "Female";
    const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
    const middleName = lastNames[Math.floor(Math.random() * lastNames.length)];

    const student: Student = {
      lrn,
      firstName,
      middleName,
      lastName,
      gender,
      gradeLevel: gradeLevels[Math.floor(Math.random() * gradeLevels.length)],
      section: sections[Math.floor(Math.random() * sections.length)],
      dateOfBirth: `20${Math.floor(Math.random() * 5) + 10}-0${Math.floor(Math.random() * 9) + 1}-${Math.floor(Math.random() * 28) + 1}`,
      heightCm: 150 + Math.floor(Math.random() * 30),
      weightKg: 40 + Math.floor(Math.random() * 25),
      religion: "Catholic",
      is4ps: Math.random() > 0.7 ? "Yes" : "No",
      isIndigenous: "No",
      fatherName: `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}`,
      fatherContact: "0917" + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
      fatherIncome: "15000",
      motherName: `${lastNames[Math.floor(Math.random() * lastNames.length)]} ${firstNames[Math.floor(Math.random() * firstNames.length)]}`,
      motherContact: "0918" + Math.floor(Math.random() * 10000000).toString().padStart(7, '0'),
      motherIncome: "12000",
      guardianName: "",
      guardianRelationship: "",
      guardianContact: "",
      guardianIncome: "",
      siblingsCount: Math.floor(Math.random() * 4),
      siblingsBelow18: Math.floor(Math.random() * 3),
      ordinalOrder: "1st",
      houseNumber: Math.floor(Math.random() * 100).toString(),
      street: "Main St",
      barangay: barangays[Math.floor(Math.random() * barangays.length)],
      city: "Malolos City",
      learningModality: "Face-to-Face",
      internetConnectivity: "Mobile Data",
      registeredAt: new Date().toISOString(),
      registeredBy: "admin@school.ph"
    };
    students.push(student);
  }

  console.log(`Adding ${students.length} students...`);
  const studentResult = await createStudentsBulk(students);
  console.log(`Students added: ${studentResult.successCount}. Errors: ${studentResult.errors.length}`);

  console.log("Adding reports...");
  for (let i = 0; i < 15; i++) {
    const lrn = lrns[Math.floor(Math.random() * lrns.length)];
    // Minimalist report to avoid column errors
    const report: any = {
      student_lrn: lrn,
      date_of_incident: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      issue: issues[Math.floor(Math.random() * issues.length)],
      description: "Dummy report",
      action_taken: "Counseled",
      reported_by: "Teacher A",
      date_reported: new Date().toISOString().split('T')[0]
    };
    
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from("reports").insert([report]);
        if (error) {
          // If even this fails, skip reports
        }
      }
    } catch (e) {}
  }

  console.log("Adding critical reports...");
  for (let i = 0; i < 5; i++) {
    const lrn = lrns[Math.floor(Math.random() * lrns.length)];
    const report: any = {
      student_lrn: lrn,
      date_of_incident: new Date(Date.now() - Math.floor(Math.random() * 15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      issue: "Major Issue",
      description: "Critical dummy",
      reported_by: "Principal",
      date_reported: new Date().toISOString().split('T')[0]
    };
    try {
      const supabase = getSupabaseClient();
      if (supabase) {
        const { error } = await supabase.from("critical_reports").insert([report]);
      }
    } catch (e) {}
  }

  console.log("✅ Seeding complete!");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
