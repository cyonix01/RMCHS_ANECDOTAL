const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add Download to lucide-react imports if not there
const importRegex = /import\s+\{\s*FileText,\s*Users,\s*AlertCircle,\s*CheckCircle,\s*Clock,\s*TrendingUp,\s*TrendingDown,\s*Activity,\s*UserCheck,\s*BookOpen\s*\}\s*from\s*'lucide-react';/;
content = content.replace(importRegex, "import { FileText, Users, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Activity, UserCheck, BookOpen, Download } from 'lucide-react';");

// 2. Add import for exportToCSV
content = content.replace(/import \{ Report, CriticalReport, Student, UserAccount \} from '\.\.\/types';/, "import { Report, CriticalReport, Student, UserAccount } from '../types';\nimport { exportToCSV } from '../utils/exportCSV';");

// 3. Update filtering logic so studentGradeFilter applies to reports too
const reportsFilterRegex = /const allReports = \[\.\.\.reports, \.\.\.criticalReports\];/;
const newReportsLogic = `
  const allReportsRaw = [...reports, ...criticalReports];
  const allReports = studentGradeFilter === 'All' 
    ? allReportsRaw 
    : allReportsRaw.filter(r => {
        const student = students.find(s => s.lrn === r.studentLrn);
        return student && student.gradeLevel === studentGradeFilter;
      });
`;
content = content.replace(reportsFilterRegex, newReportsLogic.trim());

// 4. Add handleExport function
const handleExportCode = `
  const handleExport = () => {
    const exportData = allReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      return {
        'Student LRN': r.studentLrn,
        'Student Name': student ? \`\${student.firstName} \${student.lastName}\` : 'Unknown',
        'Grade Level': student ? student.gradeLevel : 'Unknown',
        'Section': student ? student.section : 'Unknown',
        'Issue / Offense': r.issue || (r as any).offense || 'N/A',
        'Record Status': r.recordStatus || (r as any).status || 'N/A',
        'Date Reported': r.dateReported || r.dateOfIncident || r.createdAt || 'N/A',
        'Reported By': r.reportedBy || r.createdBy || 'N/A',
        'Anecdote / Details': r.anecdote || r.details || 'N/A',
      };
    });
    
    if (exportData.length > 0) {
      exportToCSV(\`Analytics_Report_\${studentGradeFilter}_\${timeFilter}.csv\`, exportData);
    } else {
      alert("No reports available to download.");
    }
  };

  if (loading) {`;
content = content.replace(/if \(loading\) \{/, handleExportCode);

// 5. Add button to the UI
const returnRegex = /return \(\s*<div className="p-4 bg-slate-50 min-h-screen font-sans">\s*\{\/\* Top 5 Metrics Row \*\/\}/;
const newReturnCode = `return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#102604]">School Analytics & Insights</h3>
          <p className="text-sm font-medium text-slate-500">Comprehensive overview of incident reports</p>
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm rounded-sm"
        >
          <Download size={14} className="text-[#76DA0D]" />
          <span>Download CSV Report</span>
        </button>
      </div>

      {/* Top 5 Metrics Row */}`;

content = content.replace(returnRegex, newReturnCode);

fs.writeFileSync(file, content);
