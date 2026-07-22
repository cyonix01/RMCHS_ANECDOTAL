const fs = require('fs');

let notifCode = fs.readFileSync('src/components/NotificationBell.tsx', 'utf8');

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
      console.error("Failed to clear all:", err);
      notify("error", "Failed to clear notifications.");
    } finally {
      setLoading(false);
    }
  };`;

const newClearAllTail = `        } catch (err) {
          console.error("Failed to clear all:", err);
          notify("error", "Failed to clear notifications.");
        } finally {
          setLoading(false);
        }
      }
    });
  };`;

// Because the original tail didn't have console.error("Failed to clear all:", err), but let's just do a regex replace
notifCode = notifCode.replace(/  const handleClearAll = async \(\) => {[\s\S]*?setLoading\(false\);\n    }\n  };/g, 
`  const handleClearAll = async () => {
    confirm({
      title: "Clear All Notifications",
      message: "Are you sure you want to delete all notifications from the system? This action cannot be undone.",
      confirmText: "Clear All",
      variant: "danger",
      onConfirm: async () => {
        try {
          setLoading(true);
          const res = await fetch("/api/notifications", {
            method: "DELETE"
          });
          if (res.ok) {
            notify("success", "Notifications cleared successfully!");
            setNotifications([]);
          } else {
            notify("error", "Failed to clear notifications from database.");
          }
        } catch (err) {
          console.error(err);
          notify("error", "Failed to clear notifications.");
        } finally {
          setLoading(false);
        }
      }
    });
  };`);

fs.writeFileSync('src/components/NotificationBell.tsx', notifCode);

