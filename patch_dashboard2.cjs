const fs = require('fs');
let code = fs.readFileSync('src/components/DashboardView.tsx', 'utf8');

if (!code.includes('showPendingApprovalViewer')) {
  code = code.replace(/  const \[showResolvedReportsViewer, setShowResolvedReportsViewer\] = useState\(false\);/, "  const [showResolvedReportsViewer, setShowResolvedReportsViewer] = useState(false);\n  const [showPendingApprovalViewer, setShowPendingApprovalViewer] = useState(false);");
  
  const modalInsert = `
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
`;
  code = code.replace(/showOnlyResolved=\{true\}\n          \/>\n        \)\}/, "showOnlyResolved={true}\n          />\n        )}\n" + modalInsert);
}

fs.writeFileSync('src/components/DashboardView.tsx', code);
