const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const targetStatusBlock = `
                          {(userRole === 'Admin' || userRole === 'Guidance' || userRole === 'Adviser' || userRole === 'Department Head') ? (
                            <div className="space-y-1.5">
                              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400">
                                Target Status for Submission
                              </label>
                              <div className="flex bg-slate-100 p-1 rounded-sm flex-wrap gap-1">
                                <button
                                  type="button"
                                  onClick={() => setStatusEdit('On Going')}
                                  disabled={isUpdating}
                                  className={\`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-sm disabled:opacity-50 \${
                                    statusEdit === 'On Going'
                                      ? 'bg-white text-orange-600 shadow-sm border border-slate-200/50 font-bold'
                                      : 'text-slate-500 hover:text-slate-700'
                                  }\`}
                                >
                                  On Going
                                </button>
                                
                                {selectedReportForView.recordStatus !== 'Pending Approval' && selectedReportForView.recordStatus !== 'RESOLVED' && (
                                <button
                                  type="button"
                                  onClick={() => setStatusEdit('Pending Approval')}
                                  disabled={isUpdating}
                                  className={\`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-sm disabled:opacity-50 \${
                                    statusEdit === 'Pending Approval'
                                      ? 'bg-blue-600 text-white shadow-sm font-bold'
                                      : 'text-slate-500 hover:text-blue-600'
                                  }\`}
                                >
                                  SUBMIT FOR APPROVAL
                                </button>
                                )}

                                {(userRole === 'Admin' || userRole === 'Department Head') && (
                                <button
                                  type="button"
                                  onClick={() => setStatusEdit('RESOLVED')}
                                    disabled={isUpdating}
                                    className={\`flex-1 py-1.5 px-2 text-[10px] font-black uppercase tracking-wider transition-all rounded-sm disabled:opacity-50 \${
                                      statusEdit === 'RESOLVED'
                                        ? 'bg-[#102604] text-white shadow-sm font-bold'
                                        : 'text-slate-500 hover:text-[#102604]'
                                    }\`}
                                  >
                                    RESOLVED (Approve)
                                </button>
                                )}
                              </div>
                            </div>
`;

// Replace the old block
// From <div className="space-y-1.5"> up to the end of the buttons container
const oldTargetStatusStart = /\{\(userRole === 'Admin' \|\| userRole === 'Guidance' \|\| userRole === 'Adviser'\) \? \(\n\s*<div className="space-y-1\.5">[\s\S]*?<\/button>\n\s*<\/div>\n\s*<\/div>\n/;
code = code.replace(oldTargetStatusStart, targetStatusBlock);

fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
