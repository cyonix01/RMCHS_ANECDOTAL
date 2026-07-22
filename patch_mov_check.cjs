const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const target = `    if ((isTransitioningToResolved || isTransitioningToPending) && !movFile && !hasMovAlready) {
      notify("error", "Mean of Verification (MOV) file is required to resolve this report.");
      return;
    }`;

const replacement = `    const isApproving = statusEdit === 'RESOLVED' && selectedReportForView.recordStatus === 'Pending Approval';
    if ((isTransitioningToResolved || isTransitioningToPending) && !isApproving && !movFile && !hasMovAlready) {
      notify("error", "Mean of Verification (MOV) file is required to resolve this report.");
      return;
    }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
