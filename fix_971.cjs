const fs = require('fs');
let code = fs.readFileSync('src/components/ReportsViewerModal.tsx', 'utf8');

const targetStr = `
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current DB Status:</span>
                            <span className={\`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border rounded-sm \${
                              selectedReportForView.recordStatus === 'RESOLVED' 
                                ? 'border-[#76DA0D]/20 text-[#102604] bg-[#76DA0D]/10'
                                : report?.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'
                            }\`}>
`;

const replacement = `
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current DB Status:</span>
                            <span className={\`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border rounded-sm \${
                              selectedReportForView.recordStatus === 'RESOLVED' 
                                ? 'border-[#76DA0D]/20 text-[#102604] bg-[#76DA0D]/10'
                                : selectedReportForView.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'
                            }\`}>
`;

code = code.replace(targetStr, replacement);
fs.writeFileSync('src/components/ReportsViewerModal.tsx', code);
