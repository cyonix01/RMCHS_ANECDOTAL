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
  // 1.5cm by 1.5cm is 15mm by 15mm
  if (depEdLogoImg && depEdLogoImg.complete && depEdLogoImg.naturalWidth > 0) {
    try {
      const croppedLogoBase64 = cropImageToCircle(depEdLogoImg);
      const logoX = (pageWidth - 15) / 2;
      const logoY = 8;
      if (croppedLogoBase64) {
        doc.addImage(croppedLogoBase64, 'PNG', logoX, logoY, 15, 15);
      } else {
        doc.addImage(depEdLogoImg, 'PNG', logoX, logoY, 15, 15);
      }
    } catch (e) {
      console.warn("Could not draw circular cropped DepEd image to PDF:", e);
    }
  }

  // DepEd text labels (shifted down to avoid overlapping the centered 2cm logo)
  doc.setTextColor(100, 116, 139); // Slate-500
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('REPUBLIC OF THE PHILIPPINES', pageWidth / 2, 26, { align: 'center' });

  doc.setTextColor(51, 65, 85); // Slate-700
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('DEPARTMENT OF EDUCATION', pageWidth / 2, 31, { align: 'center' });

  doc.setTextColor(71, 85, 105); // Slate-600
  doc.setFont('helvetica', 'oblique');
  doc.setFontSize(10);
  doc.text('National Capital Region', pageWidth / 2, 36, { align: 'center' });
  doc.text('Schools Division Office, Quezon City', pageWidth / 2, 41, { align: 'center' });

  doc.setTextColor(16, 38, 4); // Deep Green #102604
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('RAMON MAGSAYSAY (CUBAO) HIGH SCHOOL', pageWidth / 2, 47, { align: 'center' });

  doc.setTextColor(148, 163, 184); // Slate-400
  doc.setFont('courier', 'bold');
  doc.setFontSize(10);
  doc.text('PROJECT C.A.R.E. (COUNSELING & ACADEMIC RECORDS ENGAGEMENT)', pageWidth / 2, 52, { align: 'center' });

  // Decorative divider
  doc.setDrawColor(16, 38, 4); // Deep Green
  doc.setLineWidth(1.5);
  doc.line(14, 56, pageWidth - 14, 56);

  doc.setDrawColor(118, 218, 13); // Gold
  doc.setLineWidth(0.5);
  doc.line(14, 57.2, pageWidth - 14, 57.2);

  // Memorandum Title block
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(title.toUpperCase(), pageWidth / 2, 65, { align: 'center' });

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(subtitle, pageWidth / 2, 70, { align: 'center' });

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
  doc.text(`Report Generated: ${dateStr}`, pageWidth / 2, 74, { align: 'center' });

  // Personnel details card background
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(226, 232, 240); // slate-200
  doc.setLineWidth(0.5);
  doc.rect(14, 78, pageWidth - 28, 14, 'FD');

  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('AUTHORIZED STAFF / ADVISER', 18, 83);
  doc.text('ORGANIZATIONAL SCOPE', pageWidth / 2 + 6, 83);

  doc.setTextColor(15, 23, 42); // slate-900
  doc.setFontSize(9);
  doc.text(`${personnelName} (${personnelRole})`, 18, 88);
  doc.text(subtitle.replace('•', '•'), pageWidth / 2 + 6, 88);
}

// Draw professional Signatures Block (with 3-column layout for Prepared by, Noted by, Approved by)
function drawSignaturesBlock(
  doc: jsPDF,
  yStart: number,
  prepNameFallback: string,
  prepTitleFallback: string,
  noteTitleFallback: string,
  signatories?: any
) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  
  // Make sure we have enough space, otherwise push to next page
  let y = yStart;
  if (y + 65 > pageHeight) {
    doc.addPage();
    y = 20;
  }

  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.5);
  doc.line(14, y, pageWidth - 14, y);

  // Prepare names and positions
  const pName = (signatories?.preparedByName || prepNameFallback || "").trim();
  const pPos = (signatories?.preparedByPosition || prepTitleFallback || "").trim();

  const nName = (signatories?.notedByName || "").trim();
  const nPos = (signatories?.notedByPosition || noteTitleFallback || "Guidance Coordinator").trim();

  const aName = (signatories?.approvedByName || "").trim();
  const aPos = (signatories?.approvedByPosition || "School Principal / Approving Authority").trim();

  const colLeft = 20;
  const colRight = 120;
  const lineWidth = 65;

  // --- FIRST ROW: PREPARED BY & NOTED BY ---
  y += 8;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);

  doc.text('PREPARED BY:', colLeft, y);
  doc.text('NOTED BY:', colRight, y);

  y += 14;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  // Draw Prepared By (Left Column)
  if (pName) {
    doc.text(pName, colLeft, y);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('[Signature Over Printed Name]', colLeft, y);
    doc.setTextColor(15, 23, 42);
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.line(colLeft, y + 1.5, colLeft + lineWidth, y + 1.5);

  // Draw Noted By (Right Column)
  if (nName) {
    doc.text(nName, colRight, y);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('[Signature Over Printed Name]', colRight, y);
    doc.setTextColor(15, 23, 42);
  }
  doc.line(colRight, y + 1.5, colRight + lineWidth, y + 1.5);

  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(pPos, colLeft, y, { maxWidth: lineWidth });
  doc.text(nPos, colRight, y, { maxWidth: lineWidth });

  // --- SECOND ROW (HIERARCHY): APPROVED BY ---
  y += 20; // Distinct space for the higher level of authority
  
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('APPROVED BY:', colRight, y); // Approved by is aligned on the right under the Noting authority

  y += 14;
  doc.setTextColor(15, 23, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);

  if (aName) {
    doc.text(aName, colRight, y);
  } else {
    doc.setTextColor(148, 163, 184);
    doc.text('[Signature Over Printed Name]', colRight, y);
    doc.setTextColor(15, 23, 42);
  }
  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.25);
  doc.line(colRight, y + 1.5, colRight + lineWidth, y + 1.5);

  y += 5;
  doc.setTextColor(100, 116, 139);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(aPos, colRight, y, { maxWidth: lineWidth });
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

// Native high-fidelity Category-specific Donut chart drawing
function drawCategoryDonutBreakdown(
  doc: jsPDF, 
  x: number, 
  y: number, 
  w: number, 
  h: number, 
  title: string, 
  list: any[],
  themeType: 'General' | 'Critical' | 'CICL'
) {
  drawCardContainer(doc, x, y, w, h, title);

  const issueCounts: Record<string, number> = {};
  list.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });

  const total = list.length;
  
  const sortedIssues = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  let colors = [
    { r: 71, g: 85, b: 105 },  // slate-600
    { r: 59, g: 130, b: 246 }, // blue-500
    { r: 16, g: 185, b: 129 }, // emerald-500
    { r: 99, g: 102, b: 241 }  // indigo-500
  ];

  if (themeType === 'Critical') {
    colors = [
      { r: 220, g: 38, b: 38 },  // red-600
      { r: 239, g: 68, b: 68 },  // red-500
      { r: 185, g: 28, b: 28 },  // red-700
      { r: 248, g: 113, b: 113 } // red-400
    ];
  } else if (themeType === 'CICL') {
    colors = [
      { r: 249, g: 115, b: 22 },  // orange-500
      { r: 217, g: 119, b: 6 },   // amber-600
      { r: 245, g: 158, b: 11 },  // amber-500
      { r: 251, g: 191, b: 36 }   // amber-400
    ];
  }

  const otherColor = { r: 148, g: 163, b: 184 }; // Slate

  const cx = x + 15;
  const cy = y + h / 2 + 1;
  const rOuter = 11;
  const rInner = 6.5;

  let currentDeg = 0;
  
  if (total === 0) {
    drawDonutSector(doc, cx, cy, rOuter, rInner, 0, 360, 226, 232, 240);
    doc.setTextColor(148, 163, 184);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.text("No cases", x + 28, y + h / 2 + 1.5);
    return;
  }

  let colorIdx = 0;
  let topY = y + 8;

  sortedIssues.forEach(([issue, count]) => {
    const percent = count / total;
    const deg = percent * 360;
    const col = colors[colorIdx % colors.length];

    drawDonutSector(doc, cx, cy, rOuter, rInner, currentDeg, currentDeg + deg, col.r, col.g, col.b);
    currentDeg += deg;

    // Legend block
    doc.setFillColor(col.r, col.g, col.b);
    doc.rect(x + 28, topY, 1.5, 1.5, 'F');
    
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    const label = issue.length > 13 ? issue.substring(0, 11) + '...' : issue;
    doc.text(`${label}: ${count} (${Math.round(percent * 100)}%)`, x + 30.5, topY + 1.3);

    topY += 3.8;
    colorIdx++;
  });

  const topSum = sortedIssues.reduce((acc, curr) => acc + curr[1], 0);
  const othersCount = total - topSum;
  if (othersCount > 0) {
    const percent = othersCount / total;
    const deg = percent * 360;
    drawDonutSector(doc, cx, cy, rOuter, rInner, currentDeg, currentDeg + deg, otherColor.r, otherColor.g, otherColor.b);
    
    doc.setFillColor(otherColor.r, otherColor.g, otherColor.b);
    doc.rect(x + 28, topY, 1.5, 1.5, 'F');
    doc.setTextColor(51, 65, 85);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(4.5);
    doc.text(`Others: ${othersCount} (${Math.round(percent * 100)}%)`, x + 30.5, topY + 1.3);
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

// Draw Grade & Gender Distribution Stacked Bar Chart
function drawGradeGenderDistribution(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  reports: any[],
  criticalReports: any[],
  students: any[]
) {
  drawCardContainer(doc, x, y, w, h, "Grade & Gender Distribution", "This Year");

  // Legends - Male (Blue), Female (Pink)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(5);

  doc.setFillColor(59, 130, 246); // Blue #3b82f6
  doc.rect(x + w - 30, y + 5.5, 2, 2, 'F');
  doc.setTextColor(100, 116, 139);
  doc.text('Male', x + w - 27, y + 7.2);

  doc.setFillColor(236, 72, 153); // Pink #ec4899
  doc.rect(x + w - 16, y + 5.5, 2, 2, 'F');
  doc.text('Female', x + w - 13, y + 7.2);

  const grades = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const displayGrades = ['G7', 'G8', 'G9', 'G10', 'G11', 'G12'];

  const counts: Record<string, { Male: number; Female: number }> = {
    'Grade 7': { Male: 0, Female: 0 },
    'Grade 8': { Male: 0, Female: 0 },
    'Grade 9': { Male: 0, Female: 0 },
    'Grade 10': { Male: 0, Female: 0 },
    'Grade 11': { Male: 0, Female: 0 },
    'Grade 12': { Male: 0, Female: 0 }
  };

  const studentMap = new Map(students.map(s => [s.lrn, s]));
  const allReports = [...reports, ...criticalReports];
  allReports.forEach(r => {
    const student = studentMap.get(r.studentLrn);
    if (student && student.gradeLevel && student.gender) {
      if (counts[student.gradeLevel]) {
        const sGender = student.gender?.toLowerCase();
        if (sGender === 'male' || sGender === 'm') {
          counts[student.gradeLevel]['Male']++;
        } else if (sGender === 'female' || sGender === 'f') {
          counts[student.gradeLevel]['Female']++;
        }
      }
    }
  });

  // Calculate max stacked value for scaling
  let maxStacked = 5;
  grades.forEach(g => {
    const total = counts[g].Male + counts[g].Female;
    if (total > maxStacked) {
      maxStacked = total;
    }
  });

  // Round maxStacked to nearest even number
  if (maxStacked % 2 !== 0) {
    maxStacked += 1;
  }

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
    const val = Math.round((maxStacked / gridSteps) * i);
    const gy = plotBottom - (i / gridSteps) * ch;
    doc.text(`${val}`, plotLeft - 3, gy + 1.5, { align: 'right' });
    doc.line(plotLeft, gy, plotRight, gy);
  }

  const stepX = cw / 6;
  const barW = 3.5;

  grades.forEach((g, i) => {
    const cx = plotLeft + (i + 0.5) * stepX;
    const mCount = counts[g].Male;
    const fCount = counts[g].Female;

    const mHeight = (mCount / maxStacked) * ch;
    const fHeight = (fCount / maxStacked) * ch;

    // Draw stacked bars
    if (mHeight > 0) {
      doc.setFillColor(59, 130, 246);
      doc.rect(cx - barW / 2, plotBottom - mHeight, barW, mHeight, 'F');
    }
    if (fHeight > 0) {
      doc.setFillColor(236, 72, 153);
      doc.rect(cx - barW / 2, plotBottom - mHeight - fHeight, barW, fHeight, 'F');
    }

    doc.setTextColor(100, 116, 139);
    doc.text(displayGrades[i], cx, plotBottom + 4.5, { align: 'center' });
  });
}

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
    doc.text(`${titleNumber}. CHILDREN IN CONFLICT WITH THE LAW (CICL) CASE DATA`, 14, currentY);

    const ciclTableData = ciclReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const studentName = student ? `${student.lastName}, ${student.firstName}` : r.studentLrn;
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
        0: { fontStyle: 'normal', cellWidth: 15 },
        1: { halign: 'left', cellWidth: 20 },
        2: { fontStyle: 'bold', cellWidth: 35 },
        3: { halign: 'left', textColor: [220, 38, 38], cellWidth: 30 },
        4: { halign: 'left', cellWidth: 'auto' },
        5: { halign: 'center', fontStyle: 'bold', cellWidth: 15 }
      },
      margin: { left: 14, right: 14 }
    });

    return (doc as any).lastAutoTable.finalY + 15;
  }
  return startY;
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

  // Load signatories from API
  let signatories: any = null;
  try {
    const res = await fetch("/api/signatories");
    if (res.ok) {
      signatories = await res.json();
    }
  } catch (err) {
    console.error("Failed to load signatories for PDF:", err);
  }

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
  doc.text('II. OFFENSE / BEHAVIORAL CATEGORIES BREAKDOWNS', 14, y);
  y += 5;

  const ciclIssuesList = ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"];

  const sectionGeneral = allSectionReports.filter(r => {
    if (criticalReports.some(cr => cr.id === r.id)) return false;
    if (ciclIssuesList.includes(r.issue || "")) return false;
    return true;
  });

  const sectionCritical = allSectionReports.filter(r => {
    return criticalReports.some(cr => cr.id === r.id);
  });

  const sectionCicl = allSectionReports.filter(r => {
    return !criticalReports.some(cr => cr.id === r.id) && ciclIssuesList.includes(r.issue || "");
  });

  const getTableDataForList = (list: any[]) => {
    const counts: Record<string, { Male: number; Female: number; Total: number }> = {};
    list.forEach(r => {
      const issue = r.issue || 'Others';
      if (!counts[issue]) {
        counts[issue] = { Male: 0, Female: 0, Total: 0 };
      }
      const student = students.find(s => s.lrn === r.studentLrn);
      const sGender = student?.gender?.toLowerCase() || 'unknown';
      if (sGender === 'male' || sGender === 'm') {
        counts[issue].Male++;
      } else if (sGender === 'female' || sGender === 'f') {
        counts[issue].Female++;
      }
      counts[issue].Total++;
    });
    const total = list.length;
    return Object.entries(counts)
      .sort((a, b) => b[1].Total - a[1].Total)
      .map(([name, val]) => [
        name,
        `${val.Male}`,
        `${val.Female}`,
        `${val.Total}`,
        `${total > 0 ? Math.round((val.Total / total) * 100) : 0}%`
      ]);
  };

  // II-A. General Issues Table
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`II-A. GENERAL BEHAVIORAL ISSUES (${sectionGeneral.length} cases)`, 14, y);

  const generalTableData = getTableDataForList(sectionGeneral);
  if (generalTableData.length === 0) {
    generalTableData.push(['No general behavioral issues recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['General Issue Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: generalTableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // II-B. Critical Incidents Table
  if (y + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`II-B. CRITICAL INCIDENTS (${sectionCritical.length} cases)`, 14, y);

  const criticalTableData = getTableDataForList(sectionCritical);
  if (criticalTableData.length === 0) {
    criticalTableData.push(['No critical incidents recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['Critical Incident Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: criticalTableData,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // II-C. CICL Offenses Table
  if (y + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`II-C. CHILDREN IN CONFLICT WITH THE LAW (CICL) OFFENSES (${sectionCicl.length} cases)`, 14, y);

  const ciclTableData = getTableDataForList(sectionCicl);
  if (ciclTableData.length === 0) {
    ciclTableData.push(['No CICL offenses recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['CICL Offense Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: ciclTableData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
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

  // Dedicated Page for Section Graphs & Visualizations
  doc.addPage();
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. SECTION-SPECIFIC DATA VISUALIZATIONS & BEHAVIORAL TRENDS', 14, 15);

  const colW = (pageWidth - 28 - 4) / 2;
  const col3W = (pageWidth - 28 - 6) / 3;

  // Row 1 - side by side Trend and Resolutions
  drawReportTrend(doc, 14, 19, colW, 34, reports, criticalReports);
  drawReportsVsResolutions(doc, 14 + colW + 4, 19, colW, 34, reports, criticalReports);
  
  // Row 2 - side by side Case Status and Grade/Gender Distribution
  drawCaseStatus(doc, 14, 56, colW, 34, reports, criticalReports);
  drawGradeGenderDistribution(doc, 14 + colW + 4, 56, colW, 34, reports, criticalReports, students);
  
  // Row 3 - Three category donuts side-by-side
  drawCategoryDonutBreakdown(doc, 14, 93, col3W, 38, "General Issues Breakdown", sectionGeneral, 'General');
  drawCategoryDonutBreakdown(doc, 14 + col3W + 3, 93, col3W, 38, "Critical Issues Breakdown", sectionCritical, 'Critical');
  drawCategoryDonutBreakdown(doc, 14 + (col3W + 3) * 2, 93, col3W, 38, "CICL Issues Breakdown", sectionCicl, 'CICL');

  // Row 4 - side by side Frequency Analysis
  drawTopIssues(doc, 14, 134, colW, 34, reports, criticalReports);
  drawTopStudents(doc, 14 + colW + 4, 134, colW, 34, reports, criticalReports, students);

  // CICL Reports Data Table
  let adviserY = 171; // Starts right after Row 4 charts
  adviserY = drawCiclReportsTable(doc, adviserY, allSectionReports, students, "V");

  // If the table or graphs pushed Y too far, add a page for signatures
  if (adviserY > 230) {
    doc.addPage();
    adviserY = 20;
  }

  // Signatures at the bottom of the page
  drawSignaturesBlock(
    doc,
    Math.max(adviserY, 50),
    personnelName,
    "Class Adviser / Faculty Member",
    "Guidance Counselor / School Principal",
    signatories
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

  // Load signatories from API
  let signatories: any = null;
  try {
    const res = await fetch("/api/signatories");
    if (res.ok) {
      signatories = await res.json();
    }
  } catch (err) {
    console.error("Failed to load signatories for PDF:", err);
  }

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
    
    const gradeGeneralAll = reports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCritical = criticalReports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCICL = reports.filter(r => studentLrnSet.has(r.studentLrn) && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    const gradeGeneral = gradeGeneralAll.filter(r => !["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    
    const totalReports = gradeGeneral.length + gradeCritical.length + gradeCICL.length;
    const resolved = [...gradeGeneralAll, ...gradeCritical].filter(r => r.recordStatus === 'RESOLVED').length;
    const rate = totalReports > 0 ? Math.round((resolved / totalReports) * 100) : 100;

    let genMale = 0;
    let genFemale = 0;
    gradeGeneral.forEach(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const sGender = student?.gender?.toLowerCase() || 'unknown';
      if (sGender === 'male' || sGender === 'm') genMale++;
      else if (sGender === 'female' || sGender === 'f') genFemale++;
    });

    let critMale = 0;
    let critFemale = 0;
    gradeCritical.forEach(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const sGender = student?.gender?.toLowerCase() || 'unknown';
      if (sGender === 'male' || sGender === 'm') critMale++;
      else if (sGender === 'female' || sGender === 'f') critFemale++;
    });

    let ciclMale = 0;
    let ciclFemale = 0;
    gradeCICL.forEach(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      const sGender = student?.gender?.toLowerCase() || 'unknown';
      if (sGender === 'male' || sGender === 'm') ciclMale++;
      else if (sGender === 'female' || sGender === 'f') ciclFemale++;
    });

    return [
      grade,
      `${gradeStudents.length}`,
      `${genMale}`,
      `${genFemale}`,
      `${gradeGeneral.length}`,
      `${critMale}`,
      `${critFemale}`,
      `${gradeCritical.length}`,
      `${ciclMale}`,
      `${ciclFemale}`,
      `${gradeCICL.length}`,
      `${totalReports}`,
      `${rate}%`
    ];
  });

  autoTable(doc, {
    startY: y + 3,
    head: [[
      'Grade Level',
      'Total Students',
      'Gen (M)',
      'Gen (F)',
      'Gen (T)',
      'Crit (M)',
      'Crit (F)',
      'Crit (T)',
      'CICL (M)',
      'CICL (F)',
      'CICL (T)',
      'Total Cases',
      'Res. Rate'
    ]],
    body: gradeBreakdownStats,
    theme: 'striped',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 6.5 },
    bodyStyles: { fontSize: 6.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center' },
      2: { halign: 'center' },
      3: { halign: 'center' },
      4: { halign: 'center', fontStyle: 'bold' },
      5: { halign: 'center', textColor: [185, 28, 28] },
      6: { halign: 'center', textColor: [185, 28, 28] },
      7: { halign: 'center', fontStyle: 'bold', textColor: [185, 28, 28] },
      8: { halign: 'center', textColor: [194, 65, 12] },
      9: { halign: 'center', textColor: [194, 65, 12] },
      10: { halign: 'center', fontStyle: 'bold', textColor: [194, 65, 12] },
      11: { halign: 'center', fontStyle: 'bold' },
      12: { halign: 'right', fontStyle: 'bold' }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // III. Offense classification
  if (y + 40 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('III. DETAILED OFFENSE / BEHAVIORAL CATEGORIES BREAKDOWNS', 14, y);
  y += 5;

  const ciclIssuesList = ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"];

  const generalReportsFiltered = allReports.filter(r => {
    if (criticalReports.some(cr => cr.id === r.id)) return false;
    if (ciclIssuesList.includes(r.issue || "")) return false;
    return true;
  });

  const criticalReportsFiltered = allReports.filter(r => {
    return criticalReports.some(cr => cr.id === r.id);
  });

  const ciclReportsFiltered = allReports.filter(r => {
    return !criticalReports.some(cr => cr.id === r.id) && ciclIssuesList.includes(r.issue || "");
  });

  const getTableDataForList = (list: any[]) => {
    const counts: Record<string, { Male: number; Female: number; Total: number }> = {};
    list.forEach(r => {
      const issue = r.issue || 'Others';
      if (!counts[issue]) {
        counts[issue] = { Male: 0, Female: 0, Total: 0 };
      }
      const student = students.find(s => s.lrn === r.studentLrn);
      const sGender = student?.gender?.toLowerCase() || 'unknown';
      if (sGender === 'male' || sGender === 'm') {
        counts[issue].Male++;
      } else if (sGender === 'female' || sGender === 'f') {
        counts[issue].Female++;
      }
      counts[issue].Total++;
    });
    const total = list.length;
    return Object.entries(counts)
      .sort((a, b) => b[1].Total - a[1].Total)
      .map(([name, val]) => [
        name,
        `${val.Male}`,
        `${val.Female}`,
        `${val.Total}`,
        `${total > 0 ? Math.round((val.Total / total) * 100) : 0}%`
      ]);
  };

  // III-A. General Issues Table
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`III-A. GENERAL BEHAVIORAL ISSUES (${generalReportsFiltered.length} cases)`, 14, y);

  const generalTableData = getTableDataForList(generalReportsFiltered);
  if (generalTableData.length === 0) {
    generalTableData.push(['No general behavioral issues recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['General Issue Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: generalTableData,
    theme: 'grid',
    headStyles: { fillColor: [16, 38, 4], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // III-B. Critical Incidents Table
  if (y + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(220, 38, 38);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`III-B. CRITICAL INCIDENTS (${criticalReportsFiltered.length} cases)`, 14, y);

  const criticalTableData = getTableDataForList(criticalReportsFiltered);
  if (criticalTableData.length === 0) {
    criticalTableData.push(['No critical incidents recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['Critical Incident Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: criticalTableData,
    theme: 'grid',
    headStyles: { fillColor: [220, 38, 38], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 8;

  // III-C. CICL Offenses Table
  if (y + 30 > doc.internal.pageSize.getHeight()) {
    doc.addPage();
    y = 20;
  }

  doc.setTextColor(249, 115, 22);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.text(`III-C. CHILDREN IN CONFLICT WITH THE LAW (CICL) OFFENSES (${ciclReportsFiltered.length} cases)`, 14, y);

  const ciclTableData = getTableDataForList(ciclReportsFiltered);
  if (ciclTableData.length === 0) {
    ciclTableData.push(['No CICL offenses recorded', '0', '0', '0', '0%']);
  }

  autoTable(doc, {
    startY: y + 2,
    head: [['CICL Offense Type', 'Male', 'Female', 'Combined Total', 'Percentage Ratio']],
    body: ciclTableData,
    theme: 'grid',
    headStyles: { fillColor: [249, 115, 22], textColor: [255, 255, 255], fontStyle: 'bold', fontSize: 7.5 },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'center', cellWidth: 22 },
      2: { halign: 'center', cellWidth: 22 },
      3: { halign: 'center', cellWidth: 32 },
      4: { halign: 'right', cellWidth: 28 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 10;

  // IV. Administrative Data Visualizations & Graphs Consolidated
  doc.addPage();
  doc.setTextColor(16, 38, 4);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('IV. ADMINISTRATIVE DATA VISUALIZATIONS & BEHAVIORAL TRENDS', 14, 15);

  const colW = (pageWidth - 28 - 4) / 2;
  const col3W = (pageWidth - 28 - 6) / 3;

  // Row 1 - side by side Trend and Resolutions
  drawReportTrend(doc, 14, 19, colW, 34, allReports, []);
  drawReportsVsResolutions(doc, 14 + colW + 4, 19, colW, 34, allReports, []);
  
  // Row 2 - side by side Case Status and Grade/Gender Distribution
  drawCaseStatus(doc, 14, 56, colW, 34, allReports, []);
  drawGradeGenderDistribution(doc, 14 + colW + 4, 56, colW, 34, allReports, [], students);
  
  // Row 3 - Three category donuts side-by-side
  drawCategoryDonutBreakdown(doc, 14, 93, col3W, 38, "General Issues Breakdown", generalReportsFiltered, 'General');
  drawCategoryDonutBreakdown(doc, 14 + col3W + 3, 93, col3W, 38, "Critical Issues Breakdown", criticalReportsFiltered, 'Critical');
  drawCategoryDonutBreakdown(doc, 14 + (col3W + 3) * 2, 93, col3W, 38, "CICL Issues Breakdown", ciclReportsFiltered, 'CICL');

  // Row 4 - side by side Frequency Analysis
  drawTopIssues(doc, 14, 134, colW, 34, allReports, []);
  drawTopStudents(doc, 14 + colW + 4, 134, colW, 34, allReports, [], students);

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
      0: { fontStyle: 'normal', cellWidth: 15 },
      1: { halign: 'left', cellWidth: 20 },
      2: { fontStyle: 'bold', cellWidth: 35 },
      3: { halign: 'left', cellWidth: 40 },
      4: { halign: 'left', cellWidth: 'auto' },
      5: { halign: 'center', fontStyle: 'bold', cellWidth: 15 }
    },
    margin: { left: 14, right: 14 }
  });

  y = (doc as any).lastAutoTable.finalY + 15;

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
    "School Principal / High Authority",
    signatories
  );

  // Save the PDF document
  doc.save(`School_Analytics_Report_${studentGradeFilter}.pdf`);
}
