const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  "return { name: name.length > 15 ? name.substring(0,15)+'...' : name, value };",
  "const nameStr = name as string;\n      return { name: nameStr.length > 15 ? nameStr.substring(0,15)+'...' : nameStr, value };"
);

fs.writeFileSync(file, content);
