const fs = require('fs');

let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const regex = /    if \(successCount > 0\) {[\s\S]*?setIsDeleting\(false\);\n  };/g;

code = code.replace(regex, 
`        if (successCount > 0) {
          notify("success", \`Successfully deleted \${successCount} reports.\`);
          setReports(prev => prev.filter(r => !selectedReportIds.has(\`\${r.type}-\${r.id}\`)));
          setSelectedReportIds(new Set());
        }
        if (failCount > 0) {
          notify("error", \`Failed to delete \${failCount} reports.\`);
        }
        setIsDeleting(false);
      }
    });
  };`);

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
