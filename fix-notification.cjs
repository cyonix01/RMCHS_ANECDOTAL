const fs = require('fs');
const file = 'src/components/NotificationBell.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  'console.error("Failed to fetch notifications:", err);',
  '// Silent fail for polling network errors\n      if (err instanceof Error && err.message === "Failed to fetch") return;\n      console.error("Failed to fetch notifications:", err);'
);

fs.writeFileSync(file, content);
