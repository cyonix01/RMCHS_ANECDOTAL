const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');
const counts = `
  const onGoingReportsCount = allTeacherReports.filter(r => r.recordStatus === 'On Going' || !r.recordStatus).length;
  const pendingApprovalReportsCount = allTeacherReports.filter(r => r.recordStatus === 'Pending Approval').length;
`;
console.log(content.includes('onGoingReportsCount'));
