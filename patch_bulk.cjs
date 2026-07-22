const fs = require('fs');

// Fix ReportsViewerModal.tsx
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const oldBulk = `  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    if (!window.confirm(\`Are you sure you want to delete \${selectedReportIds.size} selected reports? This action cannot be undone.\`)) {
      return;
    }

    setIsDeleting(true);`;

const newBulk = `  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    
    confirm({
      title: "Bulk Delete",
      message: \`Are you sure you want to delete \${selectedReportIds.size} selected reports? This action cannot be undone.\`,
      confirmText: "Delete All",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);`;

code = code.replace(oldBulk, newBulk);

const oldBulkTail = `    }

    if (successCount > 0) {
      notify("success", \`\${successCount} reports deleted successfully.\`);
      setReports(prev => prev.filter(r => !selectedReportIds.has(\`\${r.type}-\${r.id}\`)));
      setSelectedReportIds(new Set());
    }
    if (failCount > 0) {
      notify("error", \`\${failCount} reports failed to delete.\`);
    }
    setIsDeleting(false);
  };`;

const newBulkTail = `    }

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
  };`;

code = code.replace(oldBulkTail, newBulkTail);
fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);


// Fix NotificationBell.tsx
let notifCode = fs.readFileSync('src/components/NotificationBell.tsx', 'utf8');

notifCode = notifCode.replace(/const { notify } = useNotification\(\);/, "const { notify, confirm } = useNotification();");

const oldClearAll = `  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications from the system? This action cannot be undone.")) {
      return;
    }

    try {`;

const newClearAll = `  const handleClearAll = async () => {
    confirm({
      title: "Clear All Notifications",
      message: "Are you sure you want to delete all notifications from the system? This action cannot be undone.",
      confirmText: "Clear All",
      variant: "danger",
      onConfirm: async () => {
        try {`;

const oldClearAllTail = `    } catch (err) {
      console.error(err);
      notify("error", "Failed to clear notifications.");
    }
  };`;

const newClearAllTail = `        } catch (err) {
          console.error(err);
          notify("error", "Failed to clear notifications.");
        }
      }
    });
  };`;

notifCode = notifCode.replace(oldClearAll, newClearAll);
notifCode = notifCode.replace(oldClearAllTail, newClearAllTail);

fs.writeFileSync('src/components/NotificationBell.tsx', notifCode);

