const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

code = code.replace(/recordStatus\?: 'On Going' \| 'RESOLVED';/g, "recordStatus?: 'On Going' | 'Pending Approval' | 'RESOLVED';");

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
