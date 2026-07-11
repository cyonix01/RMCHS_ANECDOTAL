const fs = require('fs');

let content = fs.readFileSync('src/utils/pdfGenerator.ts', 'utf-8');

const helperFunc = `
function drawCiclReportsTable(doc: any, startY: number, reports: any[], students: any[], titleNumber: string) {
  const ciclReports = reports.filter(r => ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));

  if (ciclReports.length > 0) {
    let currentY = startY;
    if (currentY > 220) {
      doc.addPage();
      currentY = 18;
    } else if (currentY !== 18 && currentY !== 20) {
       // if we are on same page, check if we need to add a page if not enough space
       if (currentY > 200) {
         doc.addPage();
         currentY = 18;
       }
    }
    
    doc.setTextColor(16, 38, 4);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(\`\${titleNumber}. CHILDREN IN CONFLICT WITH THE LAW (CICL) CASE DATA\`, 14, currentY);

    const ciclTableData = ciclReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const studentName = student ? \`\${student.lastName}, \${student.firstName}\` : r.studentLrn;
      const dateVal = r.dateReported || r.dateOfIncident || r.createdAt || '';
      const dateStr = dateVal ? new Date(dateVal).toLocaleDateString() : 'N/A';
      return [
        r.id || 'N/A',
        dateStr,
        studentName,
        r.issue || 'Others',
        r.actionTaken || 'N/A',
        r.recordStatus || 'Pending'
      ];
    });

    // @ts-ignore
    autoTable(doc, {
      startY: currentY + 3,
      head: [['ID', 'Date', 'Student Name', 'CICL Offense', 'Action Taken', 'Status']],
      body: ciclTableData,
      theme: 'striped',
      headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
      bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'normal' },
        1: { halign: 'left' },
        2: { fontStyle: 'bold' },
        3: { halign: 'left', textColor: [220, 38, 38] },
        4: { halign: 'left' },
        5: { halign: 'center', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 15;
  }
  return startY;
}
`;

// Insert the helper function before generateAdviserPDF
content = content.replace('// 1. ADVISER SECTION PDF GENERATION', helperFunc + '\n// 1. ADVISER SECTION PDF GENERATION');

// In generateAdviserPDF, replace the call to drawSignaturesBlock
const adviserReplacement = `
  doc.addPage();
  let nextY = 20;
  nextY = drawCiclReportsTable(doc, nextY, allSectionReports, students, "V");

  drawSignaturesBlock(
    doc,
    nextY > 200 ? 192 : nextY, // fallback or dynamic if we want, drawSignaturesBlock doesn't auto-page break
`;

content = content.replace(`  // Signatures at the bottom of the data visualization page
  drawSignaturesBlock(
    doc,
    192,
    personnelName,
    "Class Adviser / Faculty Member",
    "Guidance Counselor / School Principal",
    signatories
  );`, `  // CICL Reports Data Table
  let adviserY = 200; // After graphs, maybe need a new page for signatures
  doc.addPage();
  adviserY = 20;
  adviserY = drawCiclReportsTable(doc, adviserY, allSectionReports, students, "V");

  // If the table pushed Y too far, add a page for signatures
  if (adviserY > 230) {
    doc.addPage();
    adviserY = 20;
  }

  // Signatures at the bottom of the data visualization page
  drawSignaturesBlock(
    doc,
    Math.max(adviserY, 50),
    personnelName,
    "Class Adviser / Faculty Member",
    "Guidance Counselor / School Principal",
    signatories
  );`);

// In generateAnalyticsPDF, replace the call to drawSignaturesBlock
content = content.replace(`  y = (doc as any).lastAutoTable.finalY + 15;

  // Signatures
  drawSignaturesBlock(
    doc,
    y,
    personnelName,
    "Guidance Counselor / Department Staff",
    "Guidance Administrator / School Principal",
    signatories
  );`, `  y = (doc as any).lastAutoTable.finalY + 15;

  y = drawCiclReportsTable(doc, y, allReports, students, "VI");

  if (y > 230) {
    doc.addPage();
    y = 20;
  }

  // Signatures
  drawSignaturesBlock(
    doc,
    Math.max(y, 50),
    personnelName,
    "Guidance Counselor / Department Staff",
    "Guidance Administrator / School Principal",
    signatories
  );`);

fs.writeFileSync('src/utils/pdfGenerator.ts', content);
