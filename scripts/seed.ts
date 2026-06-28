
import { createStudentsBulk, saveReport, saveCriticalReport, initDatabase, getSupabaseClient } from "../server/database.js";
import { Student, Report, CriticalReport } from "../src/types.js";

const firstNames = ["James", "Mary", "Robert", "Patricia", "John", "Jennifer", "Michael", "Linda", "William", "Elizabeth", "David", "Barbara", "Richard", "Susan", "Joseph", "Jessica", "Thomas", "Sarah", "Charles", "Karen"];
const lastNames = ["Garcia", "Santos", "Reyes", "Cruz", "Bautista", "Ocampo", "Dela Cruz", "Santiago", "Flores", "Aquino", "Pascual", "Dizon", "Mendoza", "Castillo", "Villanueva", "Ramos", "Castro", "Rivera", "Soriano", "De Leon"];
const gradeLevels: ("Grade 7" | "Grade 8" | "Grade 9" | "Grade 10" | "Grade 11" | "Grade 12")[] = ["Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"];
const sections = ["Aguinaldo", "Bonifacio", "Luna", "Rizal", "Mabini", "Silang", "Jacinto", "Del Pilar"];
const studentIssues = [
  "Habitual tardiness", "Inattentiveness / sleeping in class", "Talking back to teachers", 
  "Dress code violations", "Using gadgets during class hour without permission", 
  "Minor class disturbances (e.g. noise, jokes)", "Cutting classes / Unexcused absences", 
  "Copying assignments or mild cheating", "Peer misunderstanding or minor peer conflicts", 
  "Lack of hygiene or cleanliness issues", "Vandalism (minor cases like writing on desks)"
];
const criticalIssues = [
  "Teenage pregnancy or Pregnancy-related counseling and concerns",
  "Suicidal attempts or Suicidal ideation",
  "Bullying (Physical, Emotional, or Cyberbullying)",
  "Self-harm or Self-injury",
  "Physical abuse or Domestic violence",
  "Substance abuse (alcohol, drugs, vaping)",
  "Sexual harassment or Abuse (verbal, physical)",
  "Truancy or Child labor",
  "Physical altercation or Fights",
  "Possession of deadly weapon or dangerous items",
  "Repeated or severe cases of cutting classes",
  "Online exploitation or inappropriate online behavior",
  "Involvement in gangs or illegal activities",
  "Extreme defiance of authority or insubordination"
];
const ciclOffenses = [
  "Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"
];
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

  console.log("Adding General Student Reports...");
  // Ensure every student issue is represented at least twice
  for (const issue of studentIssues) {
    for (let j = 0; j < 2; j++) {
      const lrn = lrns[Math.floor(Math.random() * lrns.length)];
      const report: Report = {
        studentLrn: lrn,
        dateOfIncident: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
        timeOfIncident: "10:00",
        issue: issue,
        description: `Dummy report for ${issue}.`,
        actionTaken: "Counseled",
        recommendation: ["Warning", "Parent Conference", "Community Service", "Monitor", "Referral to Guidance"][Math.floor(Math.random() * 5)],
        individualFactors: ["Personal choice"],
        familyCommunityBehaviorFactors: ["Peer influence"],
        referralRecommendation: "Counseling",
        initialAssessmentMadeBy: "Teacher A",
        designation: "Class Adviser",
        reportedBy: "Teacher A",
        dateReported: new Date().toISOString().split('T')[0],
        recordStatus: Math.random() > 0.5 ? "RESOLVED" : "ON GOING"
      };
      try { await saveReport(report); } catch (e) {}
    }
  }

  console.log("Adding CICL Reports...");
  // Ensure every CICL offense is represented
  for (const offense of ciclOffenses) {
    const lrn = lrns[Math.floor(Math.random() * lrns.length)];
    const report: Report = {
      studentLrn: lrn,
      dateOfIncident: new Date(Date.now() - Math.floor(Math.random() * 30 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      timeOfIncident: "11:00",
      issue: offense,
      description: `Dummy CICL report for ${offense}.`,
      actionTaken: "Referral to DSWD",
      recommendation: ["Legal assistance", "Family counseling", "Rehabilitation Program"][Math.floor(Math.random() * 3)],
      individualFactors: ["Lack of supervision"],
      familyCommunityBehaviorFactors: ["Community environment"],
      referralRecommendation: "DSWD Referral",
      initialAssessmentMadeBy: "SPO1 Reyes",
      designation: "Police Officer",
      reportedBy: "SPO1 Reyes",
      dateReported: new Date().toISOString().split('T')[0],
      recordStatus: "ON GOING"
    };
    try { await saveReport(report); } catch (e) {}
  }

  console.log("Adding Critical Incident Reports...");
  // Ensure every critical issue is represented
  for (const issue of criticalIssues) {
    const lrn = lrns[Math.floor(Math.random() * lrns.length)];
    const report: CriticalReport = {
      studentLrn: lrn,
      dateOfIncident: new Date(Date.now() - Math.floor(Math.random() * 15 * 24 * 60 * 60 * 1000)).toISOString().split('T')[0],
      timeOfIncident: "14:30",
      issue: issue,
      description: `Critical incident dummy record for ${issue}.`,
      actionTaken: "Immediate intervention.",
      recommendation: ["Psychological Referral", "Medical Assistance", "Suspension", "Expulsion", "DSWD Referral"][Math.floor(Math.random() * 5)],
      reportedBy: "Principal Office",
      dateReported: new Date().toISOString().split('T')[0]
    };
    try { await saveCriticalReport(report); } catch (e) {}
  }

  console.log("✅ Seeding complete!");
}

seed().catch(err => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});

