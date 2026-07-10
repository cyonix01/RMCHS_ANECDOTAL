const fs = require('fs');
const file = 'src/components/StudentListDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /name:\s*\(studentMap\.get\(lrn\)\s*\|\|\s*lrn\)\.length\s*>\s*15\s*\?\s*\(studentMap\.get\(lrn\)\s*\|\|\s*lrn\)\.substring\(0,\s*15\)\s*\+\s*'\.\.\.'\s*:\s*studentMap\.get\(lrn\)\s*\|\|\s*lrn,/m;

const replacement = `
      name: (() => {
        const nameStr = (studentMap.get(lrn) || lrn) as string;
        return nameStr.length > 15 ? nameStr.substring(0, 15) + '...' : nameStr;
      })(),
`;

content = content.replace(regex, replacement.trim() + ',');

fs.writeFileSync(file, content);
