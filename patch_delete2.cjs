const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

// Replace handleDeleteReport
code = code.replace(/  const handleDeleteReport = async \(report: CombinedReport\) => {[\s\S]*?setIsDeleting\(false\);\n    }\n  };/g, 
`  const handleDeleteReport = async (report: CombinedReport) => {
    confirm({
      title: "Delete Report",
      message: \`Are you sure you want to delete this \${report.type} report for \${report.studentName}? This action cannot be undone.\`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const endpoint = report.type === 'General' 
            ? \`/api/reports/\${report.id}\` 
            : \`/api/critical-reports/\${report.id}\`;
          
          const res = await fetch(endpoint, { method: 'DELETE' });
          if (res.ok) {
            notify("success", "Report successfully deleted from registry.");
            setReports(prev => prev.filter(r => !(r.id === report.id && r.type === report.type)));
            setSelectedReportIds(prev => {
              const next = new Set(prev);
              next.delete(\`\${report.type}-\${report.id}\`);
              return next;
            });
            setShowDetail(false);
          } else {
            const errData = await res.json();
            notify("error", errData.error || "Failed to delete report.");
          }
        } catch (err) {
          notify("error", "Connection error while deleting report.");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };`);

// Replace handleBulkDelete
code = code.replace(/  const handleBulkDelete = async \(\) => {[\s\S]*?setIsDeleting\(false\);\n    }\n  };/g,
`  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    
    confirm({
      title: "Bulk Delete",
      message: \`Are you sure you want to delete \${selectedReportIds.size} selected reports? This action cannot be undone.\`,
      confirmText: "Delete All",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        let successCount = 0;
        let failCount = 0;

        for (const compositeId of selectedReportIds) {
          const [type, id] = (compositeId as string).split('-');
          try {
            const endpoint = type === 'General' ? \`/api/reports/\${id}\` : \`/api/critical-reports/\${id}\`;
            const res = await fetch(endpoint, { method: 'DELETE' });
            if (res.ok) {
              successCount++;
            } else {
              failCount++;
            }
          } catch (e) {
            failCount++;
          }
        }

        if (successCount > 0) {
          notify("success", \`\${successCount} reports deleted successfully.\`);
          setReports(prev => prev.filter(r => !selectedReportIds.has(\`\${r.type}-\${r.id}\`)));
          setSelectedReportIds(new Set());
        }
        if (failCount > 0) {
          notify("error", \`\${failCount} reports failed to delete.\`);
        }
        setIsDeleting(false);
      }
    });
  };`);

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
