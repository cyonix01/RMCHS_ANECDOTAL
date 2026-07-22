const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Add state to DashboardView
code = code.replace(/const \[showAdminPasswordsModal, setShowAdminPasswordsModal\] = useState\(false\);/,
`const [showAdminPasswordsModal, setShowAdminPasswordsModal] = useState(false);
  const [adminAction, setAdminAction] = useState<{ type: string, email?: string } | null>(null);
  const [adminActionPassword, setAdminActionPassword] = useState("");`);

const databaseActionsContentOld = `              <div className="p-6 space-y-4">
                <button
                  onClick={() => {
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
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Reports</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>
                <button
                  onClick={() => {
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
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Students</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>
                <button
                  onClick={() => {
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
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Delete Teacher Account</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>
              </div>`;

const databaseActionsContentNew = `              <div className="p-6 space-y-4">
                {adminAction ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-slate-50 border border-slate-200">
                      <h4 className="text-xs font-bold text-slate-700 mb-2">
                        {adminAction.type === "clear-reports" && "Clear All Reports"}
                        {adminAction.type === "clear-students" && "Clear All Students"}
                        {adminAction.type === "delete-teacher" && \`Delete Teacher: \${adminAction.email}\`}
                      </h4>
                      <input
                        type="password"
                        placeholder="Enter admin password"
                        value={adminActionPassword}
                        onChange={e => setAdminActionPassword(e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-slate-300 focus:outline-none focus:border-red-500 mb-3"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setAdminAction(null);
                            setAdminActionPassword("");
                          }}
                          className="flex-1 py-2 text-xs font-bold bg-white border border-slate-300 hover:bg-slate-50"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => {
                            if (!adminActionPassword) return notify("error", "Password is required");
                            const pwd = adminActionPassword;
                            const type = adminAction.type;
                            const email = adminAction.email;
                            
                            setAdminAction(null);
                            setAdminActionPassword("");

                            if (type === "clear-reports") {
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
                            } else if (type === "clear-students") {
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
                            } else if (type === "delete-teacher" && email) {
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
                          }}
                          className="flex-1 py-2 text-xs font-bold text-white bg-red-600 hover:bg-red-700"
                        >
                          Confirm Action
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      onClick={() => setAdminAction({ type: "clear-reports" })}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-red-500" />
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Reports</span>
                      </div>
                      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                    </button>
                    <button
                      onClick={() => setAdminAction({ type: "clear-students" })}
                      className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <Trash2 size={18} className="text-red-500" />
                        <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Students</span>
                      </div>
                      <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                    </button>
                    <div className="flex items-center gap-2 w-full p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group cursor-default">
                      <Trash2 size={18} className="text-red-500 shrink-0" />
                      <div className="flex-1 flex items-center gap-2">
                        <input
                          id="teacher-email-input"
                          type="email"
                          placeholder="Teacher email to delete"
                          className="w-full px-2 py-1 text-xs border border-slate-300 focus:outline-none focus:border-red-500"
                        />
                        <button
                          onClick={() => {
                            const email = (document.getElementById('teacher-email-input') as HTMLInputElement).value;
                            if (email) {
                              setAdminAction({ type: "delete-teacher", email });
                            } else {
                              notify("error", "Please enter an email first");
                            }
                          }}
                          className="px-3 py-1 bg-red-600 text-white text-xs font-bold shrink-0"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>`;

code = code.replace(databaseActionsContentOld, databaseActionsContentNew);
fs.writeFileSync('src/components/DashboardView.tsx', code);
