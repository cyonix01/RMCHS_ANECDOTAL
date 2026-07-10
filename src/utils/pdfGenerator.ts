import { jsPDF } from 'jspdf';
import 'jspdf-autotable';
import { Student, Report, CriticalReport } from '../types';

// Helper to draw a beautiful, vector-based Ramon Magsaysay High School seal/logo directly
// inside the PDF without needing network requests (avoids CORS and offline failures)
function drawSchoolSeal(doc: jsPDF, x: number, y: number) {
  // Outer circle (Gold)
  doc.setDrawColor(118, 218, 13); // #76DA0D
  doc.setFillColor(255, 255, 255);
  doc.setLineWidth(1.5);
  doc.circle(x, y, 14, 'FD');

  // Inner circle (Deep Green)
  doc.setDrawColor(16, 38, 4); // #102604
  doc.setFillColor(16, 38, 4);
  doc.setLineWidth(1);
  doc.circle(x, y, 12, 'FD');

  // Inner gold star/shield backdrop
  doc.setDrawColor(118, 218, 13);
  doc.setFillColor(118, 218, 13);
  doc.circle(x, y, 7, 'F');

  // Text markings
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('RM', x, y + 1.5, { align: 'center' });
  doc.setFontSize(4);
  doc.text('CHS', x, y + 4.5, { align: 'center' });

  // Outer border details
  doc.setDrawColor(118, 218, 13);
  doc.setLineWidth(0.5);
  doc.circle(x, y, 15, 'S');
}

// DepEd Header styling helper
function drawDepEdHeader(doc: jsPDF, title: string, subtitle: string, personnelName: string, personnelRole: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Draw seal logo on the left
  drawSchoolSeal(doc, 22, 22);

  // DepEd text labels (standard school memorandum format)
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, 14, { align: 'center' });

  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFontSize(10);
  doc.text('DEPARTMENT OF EDUCATION', pageWidth / 2, 19, { align: 'center' });

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.text('National Capital Region • Division of City Schools', pageWidth / 2, 23, { align: 'center' });

  doc.setTextColor(16, 38, 4); // Deep Green #102604
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RAMON MAGSAYSAY (CUBAO) HIGH SCHOOL', pageWidth / 2, 28, { align: 'center' });

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('PROJECT C.A.R.E. (COUNSELING & ACADEMIC RECORDS ENGAGEMENT)', pageWidth / 2, 32, { align: 'center' });

  // Decorative divider
  doc.setDrawColor(16, 38, 4); // Deep Green
  doc.setLineWidth(1.5);
  doc.line(14, 35, pageWidth - 14, 35);

  doc.setDrawColor(118, 218, 13); // Gold
  doc.setLineWidth(0.5);
  doc.line(14, 36.2, pageWidth - 14, 36.2);

  // Memorandum Title block
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 44, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth / 2, 49, { align: 'center' });

  // Date Generated
  const dateStr = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  doc.setFontSize(7.5);
  doc.text(`Report Generated: ${dateStr}`, pageWidth / 2, 53, { align: 'center' });

  // Personnel details card background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(14, 57, pageWidth - 28, 14, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED STAFF / ADVISER', 18, 62);
  doc.text('ORGANIZATIONAL SCOPE', pageWidth / 2 + 6, 62);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9);
  doc.text(`${personnelName} (${personnelRole})`, 18, 67);
  doc.text(subtitle.replace('•', '•'), pageWidth / 2 + 6, 67);
}

// Draw professional Signatures Block
function drawSignaturesBlock(doc: jsPDF, yStart: number, prepName: string, prepTitle: string, noteTitle: string) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Make sure we have enough space, otherwise push to next page
  let y = yStart;
  if (y + 35 > pageHeight) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('PREPARED BY:', 18, y);
  doc.text('NOTED / APPROVED BY:', pageWidth / 2 + 6, y);

  y += 14;
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(9);
  doc.text(prepName, 18, y);
  doc.setTextColor(148, 163, 184);
  doc.text('[Signature Over Printed Name]', pageWidth / 2 + 6, y);

  // Line indicators
  doc.setDrawColor(148, 163, 184);
  doc.line(18, y + 1.5, 90, y + 1.5);
  doc.line(pageWidth / 2 + 6, y + 1.5, pageWidth - 18, y + 1.5);

  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFontSize(7.5);
  doc.text(prepTitle, 18, y);
  doc.text(noteTitle, pageWidth / 2 + 6, y);
}

// 1. ADVISER SECTION PDF GENERATION
export function generateAdviserPDF(
  user: any,
  reportTypeFilter: 'All' | 'General' | 'Critical' | 'CICL',
  students: Student[],
  reports: Report[],
  criticalReports: CriticalReport[]
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = "Adviser's Section Incident & Behavioral Report";
  const subtitle = `Grade Level: ${user.gradeLevel} • Section: ${user.section}`;
  const personnelName = `${user.firstName} ${user.lastName}`;
  const personnelRole = `Class Adviser`;

  // Draw DepEd Header & Info
  drawDepEdHeader(doc, title, subtitle, personnelName, personnelRole);

  // Filter reports
  const getFilteredSectionReports = () => {
    if (reportTypeFilter === 'General') {
      return reports.filter(r => !["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    if (reportTypeFilter === 'Critical') {
      return criticalReports;
    }
    if (reportTypeFilter === 'CICL') {
      return reports.filter(r => ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    return [...reports, ...criticalReports];
  };

  const allSectionReports = getFilteredSectionReports();
  const totalStudents = students.length;
  const totalReportsCount = allSectionReports.length;
  const resolvedCases = allSectionReports.filter(r => r.recordStatus === 'RESOLVED').length;
  const resolutionRate = totalReportsCount > 0 ? Math.round((resolvedCases / totalReportsCount) * 100) : 100;

  // I. Metrics summary layout
  let y = 78;
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. EXECUTIVE SUMMARY OVERVIEW', 14, y);

  // Metrics Boxes
  const boxWidth = (pageWidth - 28 - 9) / 4;
  const boxHeight = 15;
  const metrics = [
    { label: 'TOTAL STUDENTS', value: `${totalStudents}` },
    { label: 'LOGGED CASES', value: `${totalReportsCount}` },
    { label: 'RESOLVED CASES', value: `${resolvedCases}` },
    { label: 'RESOLUTION RATE', value: `${resolutionRate}%` }
  ];

  metrics.forEach((metric, index) => {
    const bx = 14 + index * (boxWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(bx, y + 3, boxWidth, boxHeight, 'FD');

    // Accent line inside each box
    doc.setFillColor(16, 38, 4);
    doc.rect(bx, y + 3, 1.5, boxHeight, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.text(metric.label, bx + 4, y + 7.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'black');
    doc.setFontSize(12);
    doc.text(metric.value, bx + 4, y + 14);
  });

  // II. Offenses breakdown
  y += boxHeight + 11;
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. OFFENSE / BEHAVIORAL ISSUE CATEGORIZATION', 14, y);

  // Group issue counts
  const issueCounts: Record<string, number> = {};
  allSectionReports.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const issueBreakdownData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => [name, `${value} incident(s)`, `${totalReportsCount > 0 ? Math.round((value / totalReportsCount) * 100) : 0}%`]);

  if (issueBreakdownData.length === 0) {
    issueBreakdownData.push(['No incident reports logged for this section under selected filter', '-', '-']);
  }

  (doc as any).autoTable({
    startY: y + 3,
    head: [['Offense / Issue', 'Count', 'Percentage Ratio']],
    body: issueBreakdownData,
    theme: 'striped',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', width: 30 },
      2: { halign: 'right', width: 40 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // III. Student list & counts
  if (y + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. STUDENT LOG SUMMARY & INDIVIDUAL CASE COUNTS', 14, y);

  const getReportCounts = (lrn: string) => ({
    general: reports.filter(r => r.studentLrn === lrn).length,
    critical: criticalReports.filter(r => r.studentLrn === lrn).length,
    cicl: reports.filter(r => r.studentLrn === lrn && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue)).length
  });

  const studentTableData = students.map(student => {
    const counts = getReportCounts(student.lrn);
    const total = counts.general + counts.critical;
    return [
      `${student.lastName}, ${student.firstName}`,
      student.gender,
      `${counts.general - counts.cicl}`,
      `${counts.critical}`,
      `${counts.cicl}`,
      `${total}`
    ];
  });

  if (studentTableData.length === 0) {
    studentTableData.push(['No students registered in this section', '-', '-', '-', '-', '-']);
  }

  (doc as any).autoTable({
    startY: y + 3,
    head: [['Student Name', 'Gender', 'General', 'Critical', 'CICL', 'Total Cases']],
    body: studentTableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', textColor: [220, 38, 38] }, // Red text for critical cases
      4: { halign: 'center', textColor: [249, 115, 22] }, // Orange text for CICL
      5: { halign: 'center', fontStyle: 'bold', textColor: [15, 23, 42] }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Signatures
  drawSignaturesBlock(
    doc,
    y,
    personnelName,
    "Class Adviser / Faculty Member",
    "Guidance Counselor / School Principal"
  );

  // Save the PDF document
  doc.save(`Adviser_Report_${user.gradeLevel}_${user.section}.pdf`);
}

// 2. SCHOOL-WIDE ANALYTICS PDF GENERATION
export function generateAnalyticsPDF(
  user: any,
  studentGradeFilter: string,
  reportTypeFilter: 'All' | 'General' | 'Critical' | 'CICL',
  students: Student[],
  reports: Report[],
  criticalReports: CriticalReport[]
) {
  const doc = new jsPDF('p', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.getWidth();

  const title = "School-Wide Behavioral Analytics Report";
  const subtitle = `Grade Scope: ${studentGradeFilter === 'All' ? 'All Grade Levels (7 - 12)' : studentGradeFilter}`;
  const personnelName = user ? `${user.firstName} ${user.lastName}` : "Guidance Administrator";
  const personnelRole = user ? user.role : "Guidance Staff";

  // Draw DepEd Header & Info
  drawDepEdHeader(doc, title, subtitle, personnelName, personnelRole);

  // Filter raw data based on constraints
  const getFilteredReportsRaw = () => {
    if (reportTypeFilter === 'General') {
      return reports.filter(r => !["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    if (reportTypeFilter === 'Critical') {
      return criticalReports;
    }
    if (reportTypeFilter === 'CICL') {
      return reports.filter(r => ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    return [...reports, ...criticalReports];
  };

  const allReportsRaw = getFilteredReportsRaw();
  const allReports = studentGradeFilter === 'All' 
    ? allReportsRaw 
    : allReportsRaw.filter(r => {
        const student = students.find(s => s.lrn === r.studentLrn);
        return student && student.gradeLevel === studentGradeFilter;
      });

  const totalStudents = studentGradeFilter === 'All'
    ? students.length
    : students.filter(s => s.gradeLevel === studentGradeFilter).length;

  const totalReportsCount = allReports.length;
  const activeCases = allReports.filter(r => r.recordStatus !== 'RESOLVED').length;
  const resolvedCases = allReports.filter(r => r.recordStatus === 'RESOLVED').length;
  const resolutionRate = totalReportsCount > 0 ? Math.round((resolvedCases / totalReportsCount) * 100) : 100;

  // I. Metrics summary layout
  let y = 78;
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('I. SCHOOL-WIDE INCIDENT EXECUTIVE OVERVIEW', 14, y);

  // Metrics Boxes
  const boxWidth = (pageWidth - 28 - 12) / 5;
  const boxHeight = 15;
  const metrics = [
    { label: 'TOTAL STUDENTS', value: `${totalStudents}` },
    { label: 'TOTAL REPORTS', value: `${totalReportsCount}` },
    { label: 'ACTIVE CASES', value: `${activeCases}` },
    { label: 'RESOLVED CASES', value: `${resolvedCases}` },
    { label: 'RESOLUTION RATE', value: `${resolutionRate}%` }
  ];

  metrics.forEach((metric, index) => {
    const bx = 14 + index * (boxWidth + 3);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.rect(bx, y + 3, boxWidth, boxHeight, 'FD');

    // Accent line inside each box
    doc.setFillColor(16, 38, 4);
    doc.rect(bx, y + 3, 1.5, boxHeight, 'F');

    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.text(metric.label, bx + 3, y + 7.5);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'black');
    doc.setFontSize(11);
    doc.text(metric.value, bx + 3, y + 14);
  });

  // II. Grade-by-Grade Incident Breakdown
  y += boxHeight + 11;
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('II. GRADE-BY-GRADE INCIDENT BREAKDOWN', 14, y);

  const gradesList = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const gradeBreakdownStats = gradesList.map(grade => {
    const gradeStudents = students.filter(s => s.gradeLevel === grade);
    const studentLrnSet = new Set(gradeStudents.map(s => s.lrn));
    
    const gradeGeneral = reports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCritical = criticalReports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCICL = reports.filter(r => studentLrnSet.has(r.studentLrn) && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    
    const totalReports = gradeGeneral.length + gradeCritical.length;
    const resolved = [...gradeGeneral, ...gradeCritical].filter(r => r.recordStatus === 'RESOLVED').length;
    const rate = totalReports > 0 ? Math.round((resolved / totalReports) * 100) : 100;

    return [
      grade,
      `${gradeStudents.length}`,
      `${gradeGeneral.length - gradeCICL.length}`,
      `${gradeCritical.length}`,
      `${gradeCICL.length}`,
      `${totalReports}`,
      `${rate}%`
    ];
  });

  (doc as any).autoTable({
    startY: y + 3,
    head: [['Grade Level', 'Total Students', 'General', 'Critical', 'CICL', 'Total Reports', 'Resolution Rate']],
    body: gradeBreakdownStats,
    theme: 'striped',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center', textColor: [220, 38, 38] },
      4: { halign: 'center', textColor: [249, 115, 22] },
      5: { halign: 'center', fontStyle: 'bold' },
      6: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // III. Offense classification
  if (y + 50 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. DETAILED OFFENSE / BEHAVIORAL CATEGORIES', 14, y);

  // Group issue counts
  const issueCounts: Record<string, number> = {};
  allReports.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const issueBreakdownData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value]) => [
      name,
      `${value}`,
      `${totalReportsCount > 0 ? Math.round((value / totalReportsCount) * 100) : 0}%`
    ]);

  if (issueBreakdownData.length === 0) {
    issueBreakdownData.push(['No incident reports logged matching selected filters', '-', '-']);
  }

  (doc as any).autoTable({
    startY: y + 3,
    head: [['Issue / Offense Type', 'Incident Count', 'Percentage Ratio']],
    body: issueBreakdownData,
    theme: 'grid',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', width: 40 },
      2: { halign: 'right', width: 40 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // IV. Detailed Incident Log Table
  if (y + 50 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. RECENT CASE INCIDENT LOG (TOP 12 RECENT)', 14, y);

  // Construct recent report list
  const recentReportsList = allReports
    .map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const studentName = student ? `${student.lastName}, ${student.firstName}` : r.studentLrn;
      const dateVal = r.dateReported || r.dateOfIncident || (r as any).createdAt || '';
      const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
      return [
        r.id || 'N/A',
        dateStr,
        studentName,
        r.issue || 'Others',
        r.reportedBy || (r as any).teacherName || 'System',
        r.recordStatus || 'Pending'
      ];
    })
    .slice(0, 12);

  if (recentReportsList.length === 0) {
    recentReportsList.push(['-', '-', 'No cases logged matching selected criteria', '-', '-', '-']);
  }

  (doc as any).autoTable({
    startY: y + 3,
    head: [['ID', 'Date', 'Student Name', 'Issue / Offense', 'Reported By', 'Status']],
    body: recentReportsList,
    theme: 'striped',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'normal' },
      1: { halign: 'left' },
      2: { fontStyle: 'bold' },
      3: { halign: 'left' },
      4: { halign: 'left' },
      5: { halign: 'center', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

  // Signatures
  drawSignaturesBlock(
    doc,
    y,
    personnelName,
    "Guidance Counselor / Department Staff",
    "School Principal / High Authority"
  );

  // Save the PDF document
  doc.save(`School_Analytics_Report_${studentGradeFilter}.pdf`);
}
