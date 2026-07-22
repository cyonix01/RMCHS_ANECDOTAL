const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

// 1. Add prop
code = code.replace(/  showOnlyResolved\?: boolean;\n\}/, "  showOnlyResolved?: boolean;\n  showOnlyPendingApproval?: boolean;\n}");
code = code.replace(/  showOnlyResolved = false\n\}\) => \{/, "  showOnlyResolved = false,\n  showOnlyPendingApproval = false\n}) => {");

// 2. Add 'Pending Approval' to state (just for typescript to not complain)
code = code.replace(/useState\<'On Going' \| 'RESOLVED'\>\('On Going'\)/, "useState<'On Going' | 'Pending Approval' | 'RESOLVED'>('On Going')");

// 3. Filter logic
const oldFilter = /      if \(showOnlyResolved\) \{\n        if \(status !== 'RESOLVED'\) return false;\n      \} else \{\n        if \(status === 'RESOLVED'\) return false;\n      \}/;
const newFilter = `      if (showOnlyResolved) {
        if (status !== 'RESOLVED') return false;
      } else if (showOnlyPendingApproval) {
        if (status !== 'Pending Approval') return false;
      } else {
        if (status === 'RESOLVED' || status === 'Pending Approval') return false;
      }`;
code = code.replace(oldFilter, newFilter);

// Dependency array for the filter
code = code.replace(/, showOnlyResolved\]\);/, ", showOnlyResolved, showOnlyPendingApproval]);");

// 4. Update Titles
code = code.replace(/showOnlyResolved \? "Resolved Reports Archive" : "Institutional Record Archive"/, "showOnlyResolved ? \"Resolved Reports Archive\" : showOnlyPendingApproval ? \"Pending Approval Reports\" : \"Institutional Record Archive\"");
code = code.replace(/showOnlyResolved \? "Registry of all resolved student reports and critical incidents" : "Registry of all student reports and critical incidents"/, "showOnlyResolved ? \"Registry of all resolved student reports and critical incidents\" : showOnlyPendingApproval ? \"Registry of reports pending final approval\" : \"Registry of all student reports and critical incidents\"");

// 5. Update Status badge color
code = code.replace(/: 'border-orange-100 text-orange-600 bg-orange-50'/g, ": report?.recordStatus === 'Pending Approval' || selectedReportForView?.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'");

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
