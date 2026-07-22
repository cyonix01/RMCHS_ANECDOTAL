const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const movCheck = `    const isTransitioningToResolved = statusEdit === 'RESOLVED' && selectedReportForView.recordStatus !== 'RESOLVED';
    const isTransitioningToPending = statusEdit === 'Pending Approval' && selectedReportForView.recordStatus !== 'Pending Approval';
    // Check if actionTaken already contains an MOV file url
    const hasMovAlready = selectedReportForView.actionTaken && selectedReportForView.actionTaken.includes('[MOV File:');

    if ((isTransitioningToResolved || isTransitioningToPending) && !movFile && !hasMovAlready) {`;

code = code.replace(/    const isTransitioningToResolved = statusEdit === 'RESOLVED' && selectedReportForView\.recordStatus !== 'RESOLVED';\n    \/\/ Check if actionTaken already contains an MOV file url\n    const hasMovAlready = selectedReportForView\.actionTaken && selectedReportForView\.actionTaken\.includes\('\[MOV File:'\);\n\n    if \(isTransitioningToResolved && !movFile && !hasMovAlready\) \{/, movCheck);


code = code.replace(/\{\(statusEdit === 'RESOLVED'\) && selectedReportForView\.recordStatus !== statusEdit && \(userRole === 'Admin' \|\| userRole === 'Guidance' \|\| userRole === 'Adviser'\) && \(/, 
"{(statusEdit === 'RESOLVED' || statusEdit === 'Pending Approval') && selectedReportForView.recordStatus !== statusEdit && (userRole === 'Admin' || userRole === 'Guidance' || userRole === 'Adviser' || userRole === 'Department Head') && (");


// Fix upload condition
code = code.replace(/if \(\(statusEdit === 'RESOLVED'\) && movFile\) \{/, "if ((statusEdit === 'RESOLVED' || statusEdit === 'Pending Approval') && movFile) {");

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
