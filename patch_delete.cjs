const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

code = code.replace(/const { notify } = useNotification\(\);/g, "const { notify, confirm } = useNotification();");

const oldHandleDeleteReport = `  const handleDeleteReport = async (report: CombinedReport) => {
    if (!window.confirm(\`Are you sure you want to delete this \${report.type} report for \${report.studentName}? This action cannot be undone.\`)) {
      return;
    }

    setIsDeleting(true);`;

const newHandleDeleteReport = `  const handleDeleteReport = async (report: CombinedReport) => {
    confirm({
      title: "Delete Report",
      message: \`Are you sure you want to delete this \${report.type} report for \${report.studentName}? This action cannot be undone.\`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);`;

const oldHandleDeleteTail = `    } catch (err) {
      notify("error", "Connection error while deleting report.");
    } finally {
      setIsDeleting(false);
    }
  };`;

const newHandleDeleteTail = `        } catch (err) {
          notify("error", "Connection error while deleting report.");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };`;

const oldBulkDelete = `  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    if (!window.confirm(\`Are you sure you want to delete \${selectedReportIds.size} selected reports? This action cannot be undone.\`)) {
      return;
    }

    setIsDeleting(true);`;

const newBulkDelete = `  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    confirm({
      title: "Bulk Delete",
      message: \`Are you sure you want to delete \${selectedReportIds.size} selected reports? This action cannot be undone.\`,
      confirmText: "Delete All",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);`;

const oldBulkDeleteTail = `    } finally {
      setIsDeleting(false);
    }
  };`;

const newBulkDeleteTail = `        } finally {
          setIsDeleting(false);
        }
      }
    });
  };`;

code = code.replace(oldHandleDeleteReport, newHandleDeleteReport);
// wait, I can just use string replacements or Regex to replace the function bodies properly.

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
