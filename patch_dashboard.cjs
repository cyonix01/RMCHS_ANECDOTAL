const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

// Add state
code = code.replace(/  const \[showResolvedReportsViewer, setShowResolvedReportsViewer\] = useState\(false\);\n/, "  const [showResolvedReportsViewer, setShowResolvedReportsViewer] = useState(false);\n  const [showPendingApprovalViewer, setShowPendingApprovalViewer] = useState(false);\n");

// Add button right after view resolved button
const resolvedBtnMatch = /          \{\(user\.role === 'Admin' \|\| user\.role === 'Guidance' \|\| user\.role === 'Department Head'\) && \(\n            <button\n              id="view-resolved-reports-btn"[\s\S]*?<\/button>\n          \)\}\n/;
code = code.replace(resolvedBtnMatch, `$&
          {(user.role === 'Admin' || user.role === 'Department Head') && (
            <button
              id="view-pending-approval-reports-btn"
              onClick={() => setShowPendingApprovalViewer(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 font-bold text-[10px] tracking-widest uppercase transition-all hover:border-blue-500 hover:bg-slate-50 text-[#102604] cursor-pointer select-none h-10 shadow-sm"
            >
              <FileText size={14} className="text-blue-500" />
              <span>Pending Approval</span>
            </button>
          )}
`);

// Add modal
const resolvedModalMatch = /        \{showResolvedReportsViewer && \([\s\S]*?showOnlyResolved=\{true\}\n          \/>\n        \)\}\n/;
code = code.replace(resolvedModalMatch, `$&
        {showPendingApprovalViewer && (
          <ReportsViewerModal 
            onClose={() => {
              setShowPendingApprovalViewer(false);
              setReportsViewerQuery("");
            }} 
            userEmail={user.email || ""}
            userRole={user.role}
            userGradeLevel={user.gradeLevel}
            userSection={user.section}
            userFirstName={user.firstName}
            userLastName={user.lastName}
            initialSearchQuery={reportsViewerQuery}
            showOnlyResolved={false}
            showOnlyPendingApproval={true}
          />
        )}
`);

fs.writeFileSync('src/components/DashboardView.tsx', code);
