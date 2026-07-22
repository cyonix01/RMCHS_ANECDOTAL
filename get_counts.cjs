const fs = require('fs');
const content = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');
console.log(content.includes('onGoingReportsCount'));
