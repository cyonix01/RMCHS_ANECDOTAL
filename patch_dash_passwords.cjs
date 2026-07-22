const fs = require('fs');

let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

const clearReportsRegex = /onClick=\{\(\) => \{\n                    confirm\(\{\n                      title: "Clear Reports",\n                      message: "Are you sure you want to clear ALL student reports\? This action is permanent and cannot be undone\.",\n                      confirmText: "Clear All",\n                      variant: "danger",\n                      onConfirm: async \(\) => \{\n                        try \{\n                          const res = await fetch\("\/api\/admin\/clear-reports", \{ method: "DELETE" \}\);\n                          if \(res\.ok\) notify\("success", "Institutional reports cleared successfully\."\);\n                          else notify\("error", "System failed to clear reports\."\);\n                        \} catch \(e\) \{ notify\("error", "Network error during database operation\."\); \}\n                      \}\n                    \}\);\n                  \}\}/;

const clearReportsNew = `onClick={() => {
                    const pwd = prompt("Enter password to clear reports:");
                    if (!pwd) return;
                    confirm({
                      title: "Clear Reports",
                      message: "Are you sure you want to clear ALL student reports? This action is permanent and cannot be undone.",
                      confirmText: "Clear All",
                      variant: "danger",
                      onConfirm: async () => {
                        try {
                          const res = await fetch(\`/api/admin/clear-reports?password=\${encodeURIComponent(pwd)}\`, { method: "DELETE" });
                          if (res.ok) notify("success", "Institutional reports cleared successfully.");
                          else {
                            const errData = await res.json().catch(()=>({}));
                            notify("error", errData.error || "System failed to clear reports.");
                          }
                        } catch (e) { notify("error", "Network error during database operation."); }
                      }
                    });
                  }}`;

code = code.replace(clearReportsRegex, clearReportsNew);

const clearStudentsRegex = /onClick=\{\(\) => \{\n                    confirm\(\{\n                      title: "Clear Student Registry",\n                      message: "Are you sure you want to clear ALL registered students\? This will remove all student records from the portal\.",\n                      confirmText: "Clear Registry",\n                      variant: "danger",\n                      onConfirm: async \(\) => \{\n                        try \{\n                          const res = await fetch\("\/api\/admin\/clear-students", \{ method: "DELETE" \}\);\n                          if \(res\.ok\) notify\("success", "Student registry cleared successfully\."\);\n                          else notify\("error", "System failed to clear student registry\."\);\n                        \} catch \(e\) \{ notify\("error", "Network error during registry operation\."\); \}\n                      \}\n                    \}\);\n                  \}\}/;

const clearStudentsNew = `onClick={() => {
                    const pwd = prompt("Enter password to clear student registry:");
                    if (!pwd) return;
                    confirm({
                      title: "Clear Student Registry",
                      message: "Are you sure you want to clear ALL registered students? This will remove all student records from the portal.",
                      confirmText: "Clear Registry",
                      variant: "danger",
                      onConfirm: async () => {
                        try {
                          const res = await fetch(\`/api/admin/clear-students?password=\${encodeURIComponent(pwd)}\`, { method: "DELETE" });
                          if (res.ok) notify("success", "Student registry cleared successfully.");
                          else {
                            const errData = await res.json().catch(()=>({}));
                            notify("error", errData.error || "System failed to clear student registry.");
                          }
                        } catch (e) { notify("error", "Network error during registry operation."); }
                      }
                    });
                  }}`;

code = code.replace(clearStudentsRegex, clearStudentsNew);


const deleteTeacherRegex = /onClick=\{\(\) => \{\n                    const email = prompt\("Enter the teacher's email\/username to delete:"\);\n                    if \(email\) \{\n                      confirm\(\{\n                        title: "Delete Staff Account",\n                        message: \`Are you sure you want to permanently delete account: \$\{email\}\? This user will lose all access immediately\.\`,\n                        confirmText: "Delete Account",\n                        variant: "danger",\n                        onConfirm: async \(\) => \{\n                          try \{\n                            const res = await fetch\(\`\/api\/admin\/delete-teacher\?email=\$\{encodeURIComponent\(email\)\}\`, \{ method: "DELETE" \}\);\n                            if \(res\.ok\) notify\("success", "Teacher account deleted successfully\."\);\n                            else \{\n                              const data = await res\.json\(\);\n                              notify\("error", data\.error \|\| "Failed to delete account\."\);\n                            \}\n                          \} catch \(e\) \{ notify\("error", "Network error during account deletion\."\); \}\n                        \}\n                      \}\);\n                    \}\n                  \}\}/;

const deleteTeacherNew = `onClick={() => {
                    const email = prompt("Enter the teacher's email/username to delete:");
                    if (email) {
                      const pwd = prompt("Enter password to delete teacher account:");
                      if (!pwd) return;
                      confirm({
                        title: "Delete Staff Account",
                        message: \`Are you sure you want to permanently delete account: \${email}? This user will lose all access immediately.\`,
                        confirmText: "Delete Account",
                        variant: "danger",
                        onConfirm: async () => {
                          try {
                            const res = await fetch(\`/api/admin/delete-teacher?email=\${encodeURIComponent(email)}&password=\${encodeURIComponent(pwd)}\`, { method: "DELETE" });
                            if (res.ok) notify("success", "Teacher account deleted successfully.");
                            else {
                              const data = await res.json().catch(()=>({}));
                              notify("error", data.error || "Failed to delete account.");
                            }
                          } catch (e) { notify("error", "Network error during account deletion."); }
                        }
                      });
                    }
                  }}`;

code = code.replace(deleteTeacherRegex, deleteTeacherNew);

fs.writeFileSync('src/components/DashboardView.tsx', code);
