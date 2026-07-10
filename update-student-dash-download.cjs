const fs = require('fs');
const file = 'src/components/StudentListDashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// Add import for Download from lucide-react if not present, wait it might be present.
// Let's replace the import from lucide-react to ensure Download is there.
const importRegex = /import\s+\{\s*Users,\s*AlertCircle,\s*FileText,\s*Activity,\s*BookOpen,\s*Clock,\s*CheckCircle\s*\}\s*from\s*"lucide-react";/;
content = content.replace(importRegex, 'import { Users, AlertCircle, FileText, Activity, BookOpen, Clock, CheckCircle, Download } from "lucide-react";');

// Add import for exportToCSV
content = content.replace(/import StudentReportsViewModal from "\.\/StudentReportsViewModal";/, 'import StudentReportsViewModal from "./StudentReportsViewModal";\nimport { exportToCSV } from "../utils/exportCSV";');

// Add handleExport function before return
const handleExportCode = `
  const handleExport = () => {
    const exportData = allSectionReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      return {
        'Student LRN': r.studentLrn,
        'Student Name': student ? \`\${student.firstName} \${student.lastName}\` : 'Unknown',
        'Grade & Section': user.gradeLevel + ' - ' + user.section,
        'Issue / Offense': r.issue || r.offense || 'N/A',
        'Record Status': r.recordStatus || r.status || 'N/A',
        'Date Reported': r.dateReported || r.dateOfIncident || r.createdAt || 'N/A',
        'Reported By': r.reportedBy || r.createdBy || 'N/A',
        'Anecdote / Details': r.anecdote || r.details || 'N/A',
      };
    });
    if (exportData.length > 0) {
      exportToCSV(\`Adviser_Report_\${user.gradeLevel}_\${user.section}.csv\`, exportData);
    } else {
      alert("No reports available to download.");
    }
  };

  return (`;
content = content.replace(/return \(/, handleExportCode);

// Add the button to the header
const headerRegex = /<div className="flex items-center justify-between">\s*<h3 className="text-xl font-bold text-\[#102604\]">Adviser Dashboard: \{user\.gradeLevel\} - \{user\.section\}<\/h3>\s*<p className="text-sm font-medium text-slate-500">Overview & Class Roster<\/p>\s*<\/div>/;

const newHeader = `<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#102604]">Adviser Dashboard: {user.gradeLevel} - {user.section}</h3>
          <p className="text-sm font-medium text-slate-500">Overview & Class Roster</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm rounded-sm"
        >
          <Download size={14} className="text-[#76DA0D]" />
          <span>Download Report</span>
        </button>
      </div>`;

content = content.replace(headerRegex, newHeader);

fs.writeFileSync(file, content);
