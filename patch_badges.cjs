const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const returnStatement = "  return (";
const badgesCode = `
  const onGoingReportsCount = allTeacherReports.filter(r => r.recordStatus === 'On Going' || !r.recordStatus).length;
  const pendingApprovalReportsCount = allTeacherReports.filter(r => r.recordStatus === 'Pending Approval').length;

  return (`;

code = code.replace(returnStatement, badgesCode);

// Update View Reports button
const viewReportsBtn = `<span>View Reports</span>`;
const newViewReportsBtn = `<span>View Reports</span>
              {onGoingReportsCount > 0 && (
                <span className="bg-[#102604] text-white text-[9px] px-1.5 py-0.5 rounded-sm">
                  {onGoingReportsCount}
                </span>
              )}`;
code = code.replace(viewReportsBtn, newViewReportsBtn);

// Update Pending Approval button
const pendingApprovalBtn = `<span>Pending Approval</span>`;
const newPendingApprovalBtn = `<span>Pending Approval</span>
              {pendingApprovalReportsCount > 0 && (
                <span className="bg-blue-500 text-white text-[9px] px-1.5 py-0.5 rounded-sm">
                  {pendingApprovalReportsCount}
                </span>
              )}`;
code = code.replace(pendingApprovalBtn, newPendingApprovalBtn);

fs.writeFileSync('src/components/DashboardView.tsx', code);
