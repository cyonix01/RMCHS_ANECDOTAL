const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const calcString = `
  // 1. Top level metrics
  const totalStudents = students.length;
  const activeCases = allReports.filter(r => r.recordStatus !== 'RESOLVED' && r.recordStatus !== 'Resolved').length;
  const resolvedCases = allReports.filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;
  const totalReportsCount = allReports.length;
  const criticalCasesCount = criticalReports.length;

  // Calculate This Month and Today
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let reportsThisMonth = 0;
  let reportsToday = 0;
  let criticalThisMonth = 0;
  let criticalToday = 0;
  let resolvedThisMonth = 0;
  let resolvedToday = 0;

  allReports.forEach(r => {
    const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now()).getTime();
    if (d >= startOfMonth) reportsThisMonth++;
    if (d >= startOfDay) reportsToday++;
    if ((r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') && d >= startOfMonth) resolvedThisMonth++;
    if ((r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') && d >= startOfDay) resolvedToday++;
  });

  criticalReports.forEach(r => {
    const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now()).getTime();
    if (d >= startOfMonth) criticalThisMonth++;
    if (d >= startOfDay) criticalToday++;
  });
`;

const startIndex = content.indexOf("  // 1. Top level metrics");
const endIndex = content.indexOf("  // Secondary metrics");

content = content.substring(0, startIndex) + calcString.trim() + "\n\n  " + content.substring(endIndex);

fs.writeFileSync(file, content);
