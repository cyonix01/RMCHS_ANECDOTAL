const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// remove the injected code from inside useEffect
code = code.replace(/  const onGoingReportsCount = allTeacherReports\.filter\(r => r\.recordStatus === 'On Going' \|\| !r\.recordStatus\)\.length;\n  const pendingApprovalReportsCount = allTeacherReports\.filter\(r => r\.recordStatus === 'Pending Approval'\)\.length;\n\n/g, '');

// insert it right before `return (` of the component
code = code.replace(/  return \(\n    <div id="dashboard-layout"/, "  const onGoingReportsCount = allTeacherReports.filter(r => r.recordStatus === 'On Going' || !r.recordStatus).length;\n  const pendingApprovalReportsCount = allTeacherReports.filter(r => r.recordStatus === 'Pending Approval').length;\n\n  return (\n    <div id=\"dashboard-layout\"");

fs.writeFileSync('src/components/DashboardView.tsx', code);
