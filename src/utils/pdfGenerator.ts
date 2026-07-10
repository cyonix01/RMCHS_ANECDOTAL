import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Student, Report, CriticalReport } from '../types';

// Helper to asynchronously load the DepEd logo image
function loadDepEdLogo(): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = "https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Department_of_Education.svg/500px-Department_of_Education.svg.png";
    
    const timer = setTimeout(() => {
      resolve(null);
    }, 2000); // 2-second timeout to avoid stalling the UI if offline/network blocked

    img.onload = () => {
      clearTimeout(timer);
      resolve(img);
    };
    img.onerror = () => {
      clearTimeout(timer);
      resolve(null);
    };
  });
}

// Helper to crop an HTMLImageElement into a perfect circle using an HTML Canvas, removing any black corners
function cropImageToCircle(img: HTMLImageElement): string | null {
  try {
    const canvas = document.createElement('canvas');
    const size = Math.min(img.naturalWidth, img.naturalHeight);
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    // Clear canvas to ensure complete transparency outside the circle
    ctx.clearRect(0, 0, size, size);

    // Draw circular mask
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
    ctx.closePath();
    ctx.clip();

    // Draw original image centered
    const sx = (img.naturalWidth - size) / 2;
    const sy = (img.naturalHeight - size) / 2;
    ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);

    return canvas.toDataURL('image/png');
  } catch (e) {
    console.error("Error cropping logo to perfect circle:", e);
    return null;
  }
}

// DepEd Header styling helper
function drawDepEdHeader(
  doc: jsPDF, 
  title: string, 
  subtitle: string, 
  personnelName: string, 
  personnelRole: string,
  depEdLogoImg?: HTMLImageElement | null
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  
  // Draw DepEd logo centered at the top middle of the header
  // 2cm by 2cm is 20mm by 20mm
  if (depEdLogoImg && depEdLogoImg.complete && depEdLogoImg.naturalWidth > 0) {
    try {
      const croppedLogoBase64 = cropImageToCircle(depEdLogoImg);
      const logoX = (pageWidth - 20) / 2;
      const logoY = 8;
      if (croppedLogoBase64) {
        doc.addImage(croppedLogoBase64, 'PNG', logoX, logoY, 20, 20);
      } else {
        doc.addImage(depEdLogoImg, 'PNG', logoX, logoY, 20, 20);
      }
    } catch (e) {
      console.warn("Could not draw circular cropped DepEd image to PDF:", e);
    }
  }

  // DepEd text labels (shifted down to avoid overlapping the centered 2cm logo)
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, 34, { align: 'center' });

  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFontSize(10);
  doc.text('DEPARTMENT OF EDUCATION', pageWidth / 2, 39, { align: 'center' });

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(8.5);
  doc.text('National Capital Region • Division of City Schools', pageWidth / 2, 43.5, { align: 'center' });

  doc.setTextColor(16, 38, 4); // Deep Green #102604
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text('RAMON MAGSAYSAY (CUBAO) HIGH SCHOOL', pageWidth / 2, 49, { align: 'center' });

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('courier', 'bold');
  doc.setFontSize(7.5);
  doc.text('PROJECT C.A.R.E. (COUNSELING & ACADEMIC RECORDS ENGAGEMENT)', pageWidth / 2, 53.5, { align: 'center' });

  // Decorative divider
  doc.setDrawColor(16, 38, 4); // Deep Green
  doc.setLineWidth(1.5);
  doc.line(14, 57, pageWidth - 14, 57);

  doc.setDrawColor(118, 218, 13); // Gold
  doc.setLineWidth(0.5);
  doc.line(14, 58.2, pageWidth - 14, 58.2);

  // Memorandum Title block
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 66, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth / 2, 71, { align: 'center' });

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
  doc.text(`Report Generated: ${dateStr}`, pageWidth / 2, 75, { align: 'center' });

  // Personnel details card background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(14, 79, pageWidth - 28, 14, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED STAFF / ADVISER', 18, 84);
  doc.text('ORGANIZATIONAL SCOPE', pageWidth / 2 + 6, 84);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9);
  doc.text(`${personnelName} (${personnelRole})`, 18, 89);
  doc.text(subtitle.replace('•', '•'), pageWidth / 2 + 6, 89);
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

// Donut segment drawer using radial overlap algorithm (100% reliable)
function drawDonutSector(
  doc: jsPDF, 
  cx: number, 
  cy: number, 
  rOuter: number, 
  rInner: number, 
  startDeg: number, 
  endDeg: number, 
  r: number, 
  g: number, 
  b: number
) {
  doc.setDrawColor(r, g, b);
  doc.setLineWidth(0.4);
  const step = 0.5;
  for (let a = startDeg; a < endDeg; a += step) {
    const rad = (a - 90) * Math.PI / 180;
    const x1 = cx + rInner * Math.cos(rad);
    const y1 = cy + rInner * Math.sin(rad);
    const x2 = cx + rOuter * Math.cos(rad);
    const y2 = cy + rOuter * Math.sin(rad);
    doc.line(x1, y1, x2, y2);
  }
}

// Card Container Box helper
function drawCardContainer(doc: jsPDF, x: number, y: number, w: number, h: number, title: string, subtitle?: string) {
  // Card background
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.4);
  doc.rect(x, y, w, h, 'FD');

  // Accent header border
  doc.setDrawColor(16, 38, 4); // RMCHS Deep Green
  doc.setLineWidth(1);
  doc.line(x, y, x + w, y);

  // Card Title
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text(title.toUpperCase(), x + 4, y + 5);

  if (subtitle) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text(subtitle, x + w - 4, y + 5, { align: 'right' });
  }
}

// Native high-fidelity Line Chart drawing
function drawReportTrend(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[]) {
  drawCardContainer(doc, x, y, w, h, "Report Trend", "Monthly");

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const totalCounts = [0, 0, 0, 0, 0, 0, 0];
  
  // Calculate counts for Jan-Jul
  const all = [...reports, ...criticalReports];
  all.forEach(r => {
    const dateVal = r.dateReported || r.dateOfIncident || r.createdAt;
    if (dateVal) {
      const date = new Date(dateVal);
      const m = date.getMonth();
      if (m >= 0 && m <= 6) {
        totalCounts[m]++;
      }
    }
  });

  const maxY = Math.max(...totalCounts, 5); // scale max

  const plotLeft = x + 10;
  const plotRight = x + w - 6;
  const plotTop = y + 10;
  const plotBottom = y + h - 8;
  const cw = plotRight - plotLeft;
  const ch = plotBottom - plotTop;

  // Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184); // slate-400
  doc.setLineWidth(0.1);
  doc.setDrawColor(241, 245, 249); // slate-100

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round((maxY / gridSteps) * i);
    const gy = plotBottom - (i / gridSteps) * ch;
    doc.text(`${val}`, plotLeft - 3, gy + 1.5, { align: 'right' });
    doc.line(plotLeft, gy, plotRight, gy);
  }

  // Draw Line Points
  const points: { px: number; py: number }[] = [];
  const stepX = cw / 6;
  for (let i = 0; i < 7; i++) {
    const val = totalCounts[i];
    const px = plotLeft + i * stepX;
    const py = plotBottom - (val / maxY) * ch;
    points.push({ px, py });
  }

  // Area under the line (shaded)
  doc.setDrawColor(240, 253, 230); // light green tint
  doc.setLineWidth(0.5);
  for (let i = 0; i < 7; i++) {
    doc.line(points[i].px, plotBottom, points[i].px, points[i].py);
  }

  // Draw Connective Line
  doc.setDrawColor(118, 218, 13); // #76DA0D
  doc.setLineWidth(1.2);
  for (let i = 0; i < 6; i++) {
    doc.line(points[i].px, points[i].py, points[i+1].px, points[i+1].py);
  }

  // Node Points
  doc.setFillColor(118, 218, 13);
  for (let i = 0; i < 7; i++) {
    doc.circle(points[i].px, points[i].py, 0.9, 'F');
    doc.setTextColor(100, 116, 139);
    doc.text(months[i], points[i].px, plotBottom + 4.5, { align: 'center' });
  }
}

// Native high-fidelity Reports vs Resolutions dual-bar chart drawing
function drawReportsVsResolutions(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[]) {
  drawCardContainer(doc, x, y, w, h, "Reports vs Resolutions");

  // Legends
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);
  
  doc.setFillColor(118, 218, 13); // Green
  doc.rect(x + 4, y + 7, 2, 2, 'F');
  doc.setTextColor(100, 116, 139);
  doc.text('Reports', x + 7, y + 8.5);

  doc.setFillColor(220, 38, 38); // Red
  doc.rect(x + 20, y + 7, 2, 2, 'F');
  doc.text('Pending', x + 23, y + 8.5);

  doc.setFillColor(37, 99, 235); // Blue
  doc.rect(x + 38, y + 7, 2, 2, 'F');
  doc.text('Resolved', x + 41, y + 8.5);

  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
  const totalCounts = [0, 0, 0, 0, 0, 0, 0];
  const pendingCounts = [0, 0, 0, 0, 0, 0, 0];
  const resolvedCounts = [0, 0, 0, 0, 0, 0, 0];

  const all = [...reports, ...criticalReports];
  all.forEach(r => {
    const dateVal = r.dateReported || r.dateOfIncident || r.createdAt;
    if (dateVal) {
      const date = new Date(dateVal);
      const m = date.getMonth();
      if (m >= 0 && m <= 6) {
        totalCounts[m]++;
        if (r.recordStatus === 'RESOLVED') {
          resolvedCounts[m]++;
        } else {
          pendingCounts[m]++;
        }
      }
    }
  });

  const maxY = Math.max(...totalCounts, 5);

  const plotLeft = x + 10;
  const plotRight = x + w - 6;
  const plotTop = y + 12;
  const plotBottom = y + h - 8;
  const cw = plotRight - plotLeft;
  const ch = plotBottom - plotTop;

  // Grid
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(5.5);
  doc.setTextColor(148, 163, 184);
  doc.setLineWidth(0.1);
  doc.setDrawColor(241, 245, 249);

  const gridSteps = 4;
  for (let i = 0; i <= gridSteps; i++) {
    const val = Math.round((maxY / gridSteps) * i);
    const gy = plotBottom - (i / gridSteps) * ch;
    doc.text(`${val}`, plotLeft - 3, gy + 1.5, { align: 'right' });
    doc.line(plotLeft, gy, plotRight, gy);
  }

  const stepX = cw / 6;
  const barW = 1.3;

  for (let i = 0; i < 7; i++) {
    const cx = plotLeft + i * stepX;
    
    // Bar 1 - Reports (Green)
    const h1 = (totalCounts[i] / maxY) * ch;
    if (h1 > 0) {
      doc.setFillColor(118, 218, 13);
      doc.rect(cx - barW * 1.5, plotBottom - h1, barW, h1, 'F');
    }

    // Bar 2 - Pending (Red)
    const h2 = (pendingCounts[i] / maxY) * ch;
    if (h2 > 0) {
      doc.setFillColor(220, 38, 38);
      doc.rect(cx - barW * 0.5, plotBottom - h2, barW, h2, 'F');
    }

    // Bar 3 - Resolved (Blue)
    const h3 = (resolvedCounts[i] / maxY) * ch;
    if (h3 > 0) {
      doc.setFillColor(37, 99, 235);
      doc.rect(cx + barW * 0.5, plotBottom - h3, barW, h3, 'F');
    }

    doc.setTextColor(100, 116, 139);
    doc.text(months[i], cx, plotBottom + 4.5, { align: 'center' });
  }
}

// Native high-fidelity Issue Breakdown segmented Donut chart drawing
function drawIssueBreakdown(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[]) {
  drawCardContainer(doc, x, y, w, h, "Issue Breakdown", "This Year");

  const issueCounts: Record<string, number> = {};
  const all = [...reports, ...criticalReports];
  all.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const total = all.length;
  
  const sortedIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const colors = [
    { r: 249, g: 115, b: 22 },  // Orange
    { r: 239, g: 68, b: 68 },   // Red
    { r: 59, g: 130, b: 246 },  // Blue
    { r: 16, g: 185, b: 129 },  // Emerald
    { r: 139, g: 92, b: 246 }   // Purple
  ];

  const otherColor = { r: 148, g: 163, b: 184 }; // Slate

  const cx = x + 22;
  const cy = y + h / 2 + 1;
  const rOuter = 13;
  const rInner = 8;

  let currentDeg = 0;
  
  if (total === 0) {
    drawDonutSector(doc, cx, cy, rOuter, rInner, 0, 360, 226, 232, 240);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("No cases logged", x + 44, y + h / 2 + 1.5);
    return;
  }

  let colorIdx = 0;
  let topY = y + 10;

  sortedIssues.forEach(([issue, count]) => {
    const percent = count / total;
    const deg = percent * 360;
    const col = colors[colorIdx % colors.length];

    drawDonutSector(doc, cx, cy, rOuter, rInner, currentDeg, currentDeg + deg, col.r, col.g, col.b);
    currentDeg += deg;

    // Legend block
    doc.setFillColor(col.r, col.g, col.b);
    doc.rect(x + 44, topY, 2, 2, 'F');
    
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    const label = issue.length > 18 ? issue.substring(0, 15) + '...' : issue;
    doc.text(`${label}: ${count} (${Math.round(percent * 100)}%)`, x + 48, topY + 1.8);

    topY += 5;
    colorIdx++;
  });

  const topSum = sortedIssues.reduce((acc, curr) => acc + curr[1], 0);
  const othersCount = total - topSum;
  if (othersCount > 0) {
    const percent = othersCount / total;
    const deg = percent * 360;
    drawDonutSector(doc, cx, cy, rOuter, rInner, currentDeg, currentDeg + deg, otherColor.r, otherColor.g, otherColor.b);
    
    doc.setFillColor(otherColor.r, otherColor.g, otherColor.b);
    doc.rect(x + 44, topY, 2, 2, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text(`Others: ${othersCount} (${Math.round(percent * 100)}%)`, x + 48, topY + 1.8);
  }
}

// Native Case Status Donut Chart
function drawCaseStatus(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[]) {
  drawCardContainer(doc, x, y, w, h, "Case Status", "This Year");

  const all = [...reports, ...criticalReports];
  const total = all.length;
  const resolved = all.filter(r => r.recordStatus === 'RESOLVED').length;
  const ongoing = total - resolved;

  const cx = x + 22;
  const cy = y + h / 2 + 1;
  const rOuter = 13;
  const rInner = 8;

  if (total === 0) {
    drawDonutSector(doc, cx, cy, rOuter, rInner, 0, 360, 226, 232, 240);
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6);
    doc.text("No status records", x + 44, y + h / 2 + 1.5);
    return;
  }

  const resolvedPercent = resolved / total;
  const resolvedDeg = resolvedPercent * 360;

  // Resolved (Emerald Green)
  drawDonutSector(doc, cx, cy, rOuter, rInner, 0, resolvedDeg, 16, 185, 129);
  // Ongoing (Red)
  drawDonutSector(doc, cx, cy, rOuter, rInner, resolvedDeg, 360, 220, 38, 38);

  // Legends
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(6);

  doc.setFillColor(16, 185, 129);
  doc.rect(x + 44, y + 14, 2.5, 2.5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.text(`Resolved`, x + 49, y + 16.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`${resolved} cases`, x + 64, y + 16.2);
  doc.text(`(${Math.round(resolvedPercent * 100)}%)`, x + 76, y + 16.2);

  doc.setFillColor(220, 38, 38);
  doc.rect(x + 44, y + 21, 2.5, 2.5, 'F');
  doc.setTextColor(15, 23, 42);
  doc.text(`On Going`, x + 49, y + 23.2);
  doc.setTextColor(100, 116, 139);
  doc.text(`${ongoing} cases`, x + 64, y + 23.2);
  doc.text(`(${Math.round((ongoing / total) * 100)}%)`, x + 76, y + 23.2);
}

// Native horizontal bar charts
function drawTopIssues(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[]) {
  drawCardContainer(doc, x, y, w, h, "Top Issues By Frequency");

  const issueCounts: Record<string, number> = {};
  const all = [...reports, ...criticalReports];
  all.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const sorted = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sorted.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text("No issue frequencies logged", x + 8, y + h / 2);
    return;
  }

  const maxVal = Math.max(...sorted.map(s => s[1]), 1);
  let barY = y + 10;

  sorted.forEach(([issue, count]) => {
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    const label = issue.length > 20 ? issue.substring(0, 18) + '...' : issue;
    doc.text(label, x + 4, barY + 1.5);

    doc.setFillColor(241, 245, 249);
    doc.rect(x + 36, barY, 36, 2.5, 'F');

    const filledW = (count / maxVal) * 36;
    doc.setFillColor(16, 185, 129); // Emerald Green
    doc.rect(x + 36, barY, filledW, 2.5, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${count}`, x + 75, barY + 2);

    barY += 7.5;
  });
}

function drawTopStudents(doc: jsPDF, x: number, y: number, w: number, h: number, reports: any[], criticalReports: any[], students: any[]) {
  drawCardContainer(doc, x, y, w, h, "Top Students By Record");

  const studentCounts: Record<string, number> = {};
  const all = [...reports, ...criticalReports];
  all.forEach(r => {
    studentCounts[r.studentLrn] = (studentCounts[r.studentLrn] || 0) + 1;
  });

  const sorted = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  if (sorted.length === 0) {
    doc.setTextColor(100, 116, 139);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text("No student cases recorded", x + 8, y + h / 2);
    return;
  }

  const maxVal = Math.max(...sorted.map(s => s[1]), 1);
  let barY = y + 10;

  sorted.forEach(([lrn, count]) => {
    const student = students.find(s => s.lrn === lrn);
    const name = student ? `${student.lastName}, ${student.firstName.substring(0, 1)}.` : lrn;

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.text(name, x + 4, barY + 1.5);

    doc.setFillColor(241, 245, 249);
    doc.rect(x + 36, barY, 36, 2.5, 'F');

    const filledW = (count / maxVal) * 36;
    doc.setFillColor(37, 99, 235); // Blue
    doc.rect(x + 36, barY, filledW, 2.5, 'F');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.text(`${count} case(s)`, x + 75, barY + 2);

    barY += 7.5;
  });
}

// 1. ADVISER SECTION PDF GENERATION
export async function generateAdviserPDF(
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

  // Pre-load DepEd logo
  const depEdLogoImg = await loadDepEdLogo();

  // Draw DepEd Header & Info
  drawDepEdHeader(doc, title, subtitle, personnelName, personnelRole, depEdLogoImg);

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
  let y = 98;
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

  autoTable(doc, {
    startY: y + 3,
    head: [['Offense / Issue', 'Count', 'Percentage Ratio']],
    body: issueBreakdownData,
    theme: 'striped',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 30 },
      2: { halign: 'right', cellWidth: 40 }
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

  autoTable(doc, {
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

  // Dedicated Page for Section Graphs & Signatures
  doc.addPage();
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. SECTION-SPECIFIC DATA VISUALIZATIONS & BEHAVIORAL TRENDS', 14, 18);

  const colW = (pageWidth - 28 - 4) / 2;
  // Row 1
  drawReportTrend(doc, 14, 22, colW, 40, reports, criticalReports);
  drawReportsVsResolutions(doc, 14 + colW + 4, 22, colW, 40, reports, criticalReports);
  // Row 2
  drawIssueBreakdown(doc, 14, 66, colW, 40, reports, criticalReports);
  drawCaseStatus(doc, 14 + colW + 4, 66, colW, 40, reports, criticalReports);
  // Row 3
  drawTopIssues(doc, 14, 110, colW, 35, reports, criticalReports);
  drawTopStudents(doc, 14 + colW + 4, 110, colW, 35, reports, criticalReports, students);

  // Signatures at the bottom of the data visualization page
  drawSignaturesBlock(
    doc,
    155,
    personnelName,
    "Class Adviser / Faculty Member",
    "Guidance Counselor / School Principal"
  );

  // Save the PDF document
  doc.save(`Adviser_Report_${user.gradeLevel}_${user.section}.pdf`);
}

// 2. SCHOOL-WIDE ANALYTICS PDF GENERATION
export async function generateAnalyticsPDF(
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

  // Pre-load DepEd logo
  const depEdLogoImg = await loadDepEdLogo();

  // Draw DepEd Header & Info
  drawDepEdHeader(doc, title, subtitle, personnelName, personnelRole, depEdLogoImg);

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
  let y = 98;
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

  autoTable(doc, {
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

  autoTable(doc, {
    startY: y + 3,
    head: [['Issue / Offense Type', 'Incident Count', 'Percentage Ratio']],
    body: issueBreakdownData,
    theme: 'grid',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 8 },
    bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 40 },
      2: { halign: 'right', cellWidth: 40 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // IV. Administrative Data Visualizations & Graphs Page
  doc.addPage();
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. ADMINISTRATIVE DATA VISUALIZATIONS & GRAPHS', 14, 18);

  const colW = (pageWidth - 28 - 4) / 2;
  // Row 1
  drawReportTrend(doc, 14, 22, colW, 40, allReports, []);
  drawReportsVsResolutions(doc, 14 + colW + 4, 22, colW, 40, allReports, []);
  // Row 2
  drawIssueBreakdown(doc, 14, 66, colW, 40, allReports, []);
  drawCaseStatus(doc, 14 + colW + 4, 66, colW, 40, allReports, []);
  // Row 3
  drawTopIssues(doc, 14, 110, colW, 35, allReports, []);
  drawTopStudents(doc, 14 + colW + 4, 110, colW, 35, allReports, [], students);

  // V. Recent Case Incident Log Table
  doc.addPage();
  y = 18;

  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('V. RECENT CASE INCIDENT LOG (TOP 12 RECENT)', 14, y);

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

  autoTable(doc, {
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
