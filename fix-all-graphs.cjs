const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Define filteredReports right after reportsVsResolvedData
const filterLogic = `
  // Filter for downstream charts
  let filteredReports = allReports;
  const filterToday = new Date();
  filterToday.setHours(23, 59, 59, 999);

  if (timeFilter === 'Daily') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d >= cutoff && d <= filterToday;
    });
  } else if (timeFilter === 'Weekly') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    cutoff.setHours(0, 0, 0, 0);
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d > cutoff && d <= filterToday;
    });
  } else if (timeFilter === 'Monthly') {
    const currentYear = filterToday.getFullYear();
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    });
  } else if (timeFilter === 'Yearly') {
    const cutoffYear = filterToday.getFullYear() - 4;
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d.getFullYear() >= cutoffYear;
    });
  }

  const timeLabel = timeFilter === 'Daily' ? 'Last 7 Days' : timeFilter === 'Weekly' ? 'Last 4 Weeks' : timeFilter === 'Monthly' ? 'This Year' : 'Last 5 Years';
`;

content = content.replace(
  '// 3. Issue Breakdown',
  filterLogic + '\n  // 3. Issue Breakdown'
);

// 2. Replace allReports with filteredReports in sections 3 to 10
const sectionsRegex = /\/\/ 3\. Issue Breakdown[\s\S]*?\/\/ 10\. Grade Level Distribution/m;
let match = content.match(sectionsRegex);
if (match) {
  let sectionContent = match[0];
  sectionContent = sectionContent.replace(/allReports/g, 'filteredReports');
  // but wait, section 8 is Weekly Incident Flow. 
  // Let's replace section 8 entirely
  sectionContent = sectionContent.replace(
    /\/\/ 8\. Weekly Incident Flow[\s\S]*?\/\/ 9\. Recent Reports/,
    '// 9. Recent Reports'
  );
  content = content.replace(sectionsRegex, sectionContent);
}

// And also line 324 (or around there): allReports.forEach for Grade Gender
const gradeGenderRegex = /\/\/ 10\. Grade Level Distribution[\s\S]*?const gradeGenderData =/m;
let gradeGenderMatch = content.match(gradeGenderRegex);
if (gradeGenderMatch) {
  let ggContent = gradeGenderMatch[0];
  ggContent = ggContent.replace(/allReports/g, 'filteredReports');
  content = content.replace(gradeGenderRegex, ggContent);
}


// 3. Replace static labels with timeLabel
content = content.replace(/\(This Month\)/g, '({timeLabel})');
content = content.replace(/\(This Year\)/g, '({timeLabel})');
content = content.replace(/\(By Frequency\)/g, '(By Frequency - {timeLabel})');
content = content.replace(/\(By Reports\)/g, '(By Reports - {timeLabel})');
content = content.replace(/\(All Reports\)/g, '({timeLabel})');

// 4. Update the AreaChart to use reportsVsResolvedData
content = content.replace(/data=\{weeklyReportsData\}/g, 'data={reportsVsResolvedData}');
content = content.replace(/dataKey="Incoming"/g, 'dataKey="Reports"');

fs.writeFileSync(file, content);
