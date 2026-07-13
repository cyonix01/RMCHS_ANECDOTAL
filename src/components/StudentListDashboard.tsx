import React, { useState, useEffect } from "react";
import { Student, Report, CriticalReport } from "../types";
import StudentReportsViewModal from "./StudentReportsViewModal";
import { exportToCSV } from "../utils/exportCSV";
import { generateAdviserPDF } from "../utils/pdfGenerator";
import { Users, AlertCircle, FileText, Activity, BookOpen, Clock, CheckCircle, Download, Printer } from "lucide-react";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line
} from "recharts";

interface StudentListDashboardProps {
  user: any;
}

export default function StudentListDashboard({ user: propsUser }: StudentListDashboardProps) {
  const user = {
    ...propsUser,
    firstName: propsUser.firstName || "User",
    lastName: propsUser.lastName || "",
    role: propsUser.role || "Non-Adviser"
  };
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [reportTypeFilter, setReportTypeFilter] = useState<'All' | 'General' | 'Critical' | 'CICL'>('All');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchData = React.useCallback(() => {
    Promise.all([
      fetch("/api/students").then(res => { if (!res.ok) throw new Error("Failed to fetch students"); return res.json(); }),
      fetch("/api/reports").then(res => { if (!res.ok) throw new Error("Failed to fetch reports"); return res.json(); }),
      fetch("/api/critical-reports").then(res => { if (!res.ok) throw new Error("Failed to fetch critical reports"); return res.json(); })
    ]).then(([allStudents, allReports, allCritReports]) => {
      if (allStudents.error || allReports.error || allCritReports.error) {
        throw new Error("API returned an error");
      }
      
      const filteredStudents = allStudents.filter((s: Student) => s.gradeLevel === user.gradeLevel && s.section === user.section);
      const studentLrnSet = new Set(filteredStudents.map((s: Student) => s.lrn));

      setStudents(filteredStudents.sort((a: Student, b: Student) => a.lastName.localeCompare(b.lastName)));
      setReports(allReports.filter((r: Report) => studentLrnSet.has(r.studentLrn)));
      setCriticalReports(allCritReports.filter((r: CriticalReport) => studentLrnSet.has(r.studentLrn)));
      
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user.gradeLevel, user.section]);

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000);
    return () => clearInterval(interval);
  }, [fetchData]);

  const getReportCounts = (lrn: string) => ({
    general: reports.filter(r => r.studentLrn === lrn).length,
    critical: criticalReports.filter(r => r.studentLrn === lrn).length,
    cicl: reports.filter(r => r.studentLrn === lrn && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue)).length
  });

  if (loading) return <p className="text-sm p-8 text-slate-500">Loading section data...</p>;

  // Data processing for dashboard
  const totalStudents = students.length;
  
  const getFilteredSectionReports = () => {
    if (reportTypeFilter === 'General') {
      return reports.filter(r => !["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    if (reportTypeFilter === 'Critical') {
      return criticalReports;
    }
    if (reportTypeFilter === 'CICL') {
      return reports.filter(r => ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    }
    return [...reports, ...criticalReports];
  };

  const allSectionReports = getFilteredSectionReports();
  const totalReportsCount = allSectionReports.length;
  
  const activeCriticalReports = (reportTypeFilter === 'All' || reportTypeFilter === 'Critical') ? criticalReports : [];
  const criticalCasesCount = activeCriticalReports.length;
  
  const activeCases = allSectionReports.filter(r => r.recordStatus !== 'RESOLVED' && r.recordStatus !== 'Resolved').length;
  const resolvedCases = allSectionReports.filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;

  const academicIssuesCount = allSectionReports.filter(r => r.issue && r.issue.toLowerCase().includes('academic')).length;
  const underReviewCount = allSectionReports.filter(r => r.recordStatus === 'On Going').length;

  // Trend Data (Last 6 Months)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  allSectionReports.forEach(r => {
    const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
    const d = new Date(dateStr || Date.now());
    if (!isNaN(d.getTime())) {
      monthCounts[d.getMonth()]++;
    }
  });
  
  const currentMonth = new Date().getMonth();
  const trendData = [];
  for (let i = 5; i >= 0; i--) {
    let m = currentMonth - i;
    if (m < 0) m += 12;
    trendData.push({ name: monthNames[m], value: monthCounts[m] });
  }

  // Issue Breakdown
  const issueCounts: Record<string, number> = {};
  allSectionReports.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#eab308'];
  const issueBreakdownData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      value,
      color: COLORS[i % COLORS.length]
    })).slice(0, 6);

  // Top Students
  const studentCounts: Record<string, number> = {};
  allSectionReports.forEach(r => {
    if (r.studentLrn) studentCounts[r.studentLrn] = (studentCounts[r.studentLrn] || 0) + 1;
  });
  
  const studentMap = new Map(students.map(s => [s.lrn, `${s.lastName}, ${s.firstName}`]));
  const topStudentsData = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lrn, value]) => ({
      name: (() => {
        const nameStr = (studentMap.get(lrn) || lrn) as string;
        return nameStr.length > 15 ? nameStr.substring(0, 15) + '...' : nameStr;
      })(),
      value
    }));

  
  const handleExport = () => {
    const exportData = allSectionReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      return {
        'Student LRN': r.studentLrn,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
        'Grade & Section': user.gradeLevel + ' - ' + user.section,
        'Issue / Offense': r.issue || r.offense || 'N/A',
        'Record Status': r.recordStatus || r.status || 'N/A',
        'Date Reported': r.dateReported || r.dateOfIncident || r.createdAt || 'N/A',
        'Reported By': r.reportedBy || r.createdBy || 'N/A',
        'Anecdote / Details': r.anecdote || r.details || 'N/A',
      };
    });
    if (exportData.length > 0) {
      exportToCSV(`Adviser_Report_${user.gradeLevel}_${user.section}.csv`, exportData);
    } else {
      alert("No reports available to download.");
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generateAdviserPDF(user, reportTypeFilter, students, reports, criticalReports);
    } catch (e) {
      console.error("Error generating PDF:", e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h3 className="text-xl font-bold text-[#102604]">Adviser Dashboard: {user.gradeLevel} - {user.section}</h3>
          <p className="text-sm font-medium text-slate-500">Overview & Class Roster</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm rounded-sm"
          >
            <Download size={14} className="text-[#76DA0D]" />
            <span>Download CSV</span>
          </button>
          <button
            onClick={handleDownloadPDF}
            disabled={generatingPdf}
            className={`flex items-center gap-2 px-4 py-2 bg-[#102604] hover:bg-[#102604]/90 text-white font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm rounded-sm ${generatingPdf ? "opacity-50 cursor-not-allowed" : ""}`}
          >
            <Printer size={14} className="text-[#76DA0D]" />
            <span>{generatingPdf ? "Generating..." : "Download PDF Report"}</span>
          </button>
        </div>
      </div>

      {/* Top Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
              <Users size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Students</p>
              <h2 className="text-xl font-black text-slate-800 leading-none">{totalStudents}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex flex-col justify-between gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-green-50 text-green-600 flex items-center justify-center shrink-0">
                <FileText size={16} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase">Total Reports</p>
            </div>
            <select
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value as any)}
              className="text-[9px] border border-slate-200 rounded p-0.5 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold"
            >
              <option value="All">All Types</option>
              <option value="General">General</option>
              <option value="Critical">Critical</option>
              <option value="CICL">CICL</option>
            </select>
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-800 leading-none">{totalReportsCount}</h2>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 text-red-600 flex items-center justify-center shrink-0">
              <AlertCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Critical Cases</p>
              <h2 className="text-xl font-black text-slate-800 leading-none">{criticalCasesCount}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
              <Clock size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Active / Pending</p>
              <h2 className="text-xl font-black text-slate-800 leading-none">{activeCases}</h2>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <CheckCircle size={20} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Resolved</p>
              <h2 className="text-xl font-black text-slate-800 leading-none">{resolvedCases}</h2>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Trend */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Section Trend (6 Mo)</h4>
          <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 9}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#3b82f6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Breakdown */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Issue Breakdown</h4>
          <div className="flex-1 flex min-h-[150px]">
            <div className="w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={issueBreakdownData} innerRadius={25} outerRadius={50} paddingAngle={2} dataKey="value">
                    {issueBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col justify-center gap-1.5">
              {issueBreakdownData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[9px]">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                    <span className="text-slate-600 font-medium truncate w-16" title={item.name}>{item.name}</span>
                  </div>
                  <span className="text-slate-800 font-bold">{item.value}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white p-5 border border-slate-200 shadow-sm flex flex-col">
          <h4 className="font-bold text-slate-900 mb-4 uppercase text-[10px] tracking-widest">Most Reported Students</h4>
          <div className="flex-1 min-h-[150px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStudentsData} layout="vertical" margin={{ top: 0, right: 10, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 9, fill: '#334155'}} width={70} />
                <Tooltip />
                <Bar dataKey="value" fill="#ef4444" barSize={8} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="grid md:grid-cols-2 gap-6">
        {['Male', 'Female'].map(gender => (
          <div key={gender} className="bg-white p-6 border border-slate-200 shadow-sm">
            <h4 className="font-bold text-slate-900 mb-4 uppercase text-xs tracking-widest">{gender} Students</h4>
            <div className="space-y-2">
              {students.filter(s => s.gender === gender).map(student => {
                const counts = getReportCounts(student.lrn);
                return (
                  <button 
                    key={student.lrn}
                    onClick={() => setSelectedStudent(student)}
                    className="w-full flex justify-between items-center p-3 hover:bg-slate-50 border border-slate-100 transition-colors text-left"
                  >
                    <span className="text-sm text-slate-800 font-medium">{student.lastName}, {student.firstName}</span>
                    <div className="flex gap-2">
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-1 rounded" title="General Reports">{counts.general}</span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-1 rounded" title="Critical Reports">{counts.critical}</span>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded" title="CICL Reports">{counts.cicl}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedStudent && (
        <StudentReportsViewModal student={selectedStudent} onClose={() => setSelectedStudent(null)} />
      )}

      {/* Printable Report View (Visible only during printing via CSS) */}
      <div id="printable-report-area" className="hidden print:block font-sans p-8 bg-white text-slate-800">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-report-area, #printable-report-area * {
              visibility: visible;
            }
            #printable-report-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
            }
            .print-page-break {
              page-break-before: always;
            }
            .print-card {
              border: 1px solid #e2e8f0 !important;
              border-radius: 4px !important;
              padding: 1rem !important;
              margin-bottom: 1rem !important;
              background: white !important;
            }
          }
        `}</style>
        
        {/* DepEd Header */}
        <div className="text-center border-b-2 border-slate-800 pb-4 mb-6">
          <div className="flex justify-center items-center gap-4 mb-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ramon_Magsaysay_%28Cubao%29_High_School.svg/500px-Ramon_Magsaysay_%28Cubao%29_High_School.svg.png" 
              alt="RMCHS logo" 
              className="w-16 h-16 object-contain"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="text-xs uppercase tracking-widest text-slate-500 font-bold">Republic of the Philippines</p>
              <p className="text-sm font-bold uppercase text-slate-800 leading-tight">Department of Education</p>
              <p className="text-sm font-serif italic text-slate-600">National Capital Region • Division of City Schools</p>
              <p className="text-base font-black uppercase text-slate-900 tracking-wide">RAMON MAGSAYSAY (CUBAO) HIGH SCHOOL</p>
            </div>
          </div>
          <p className="text-[10px] text-slate-400 font-mono tracking-wider">PROJECT C.A.R.E. (COUNSELING & ACADEMIC RECORDS ENGAGEMENT)</p>
        </div>

        {/* Title */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-black uppercase text-slate-900 tracking-wide">Adviser's Section Incident & Behavioral Report</h2>
          <p className="text-xs text-slate-500 font-bold">Grade Level: {user.gradeLevel} • Section: {user.section}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Report generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Report Filtering Status */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded border border-slate-100">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Class Adviser</p>
            <p className="text-xs font-bold text-slate-700">{user.firstName} {user.lastName}</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Report Type Filtering</p>
            <p className="text-xs font-bold text-slate-700">{reportTypeFilter === 'All' ? 'All Incidents (General, Critical, & CICL)' : `${reportTypeFilter} Reports Only`}</p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">I. Class Summary Overview</h3>
        <div className="grid grid-cols-4 gap-4 mb-6">
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Total Students</p>
            <h4 className="text-2xl font-black text-slate-800">{totalStudents}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Total Logged Cases</p>
            <h4 className="text-2xl font-black text-slate-800">{totalReportsCount}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Resolved Cases</p>
            <h4 className="text-2xl font-black text-slate-800">{resolvedCases}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Resolution Rate</p>
            <h4 className="text-2xl font-black text-slate-800">{totalReportsCount > 0 ? Math.round((resolvedCases / totalReportsCount) * 100) : 100}%</h4>
          </div>
        </div>

        {/* Issues breakdown table */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">II. Behavioral / Academic Offenses Breakdown</h3>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-2 font-bold">Offense / Issue Commited</th>
                <th className="p-2 font-bold text-right">Incident Count</th>
              </tr>
            </thead>
            <tbody>
              {issueBreakdownData.length === 0 ? (
                <tr>
                  <td colSpan={2} className="p-2 text-slate-400 italic">No offenses logged under this filter</td>
                </tr>
              ) : (
                issueBreakdownData.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-700">{item.name}</td>
                    <td className="p-2 font-bold text-slate-800 text-right">{item.value}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Student Roster Statistics */}
        <div className="print-page-break pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">III. Complete Student Incident Log & Case Counts</h3>
          <p className="text-[10px] text-slate-500 mb-3">Below is the complete roster for this section with individual incident counts.</p>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-2 font-bold">Student Name</th>
                <th className="p-2 font-bold">Gender</th>
                <th className="p-2 font-bold text-center">General Reports</th>
                <th className="p-2 font-bold text-center">Critical Reports</th>
                <th className="p-2 font-bold text-center">CICL Reports</th>
                <th className="p-2 font-bold text-center">Total Incidents</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => {
                const counts = getReportCounts(student.lrn);
                const sum = counts.general + counts.critical;
                return (
                  <tr key={student.lrn} className="border-b border-slate-100">
                    <td className="p-2 font-bold text-slate-700">{student.lastName}, {student.firstName}</td>
                    <td className="p-2 text-slate-600">{student.gender}</td>
                    <td className="p-2 text-center font-semibold text-slate-700">{counts.general}</td>
                    <td className="p-2 text-center font-semibold text-red-600">{counts.critical}</td>
                    <td className="p-2 text-center font-semibold text-orange-600">{counts.cicl}</td>
                    <td className="p-2 text-center font-bold text-slate-900">{sum}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-8">Prepared By:</p>
            <div className="border-b border-slate-400 pb-1 max-w-[200px]">
              <p className="text-xs font-bold text-slate-800">{user.firstName} {user.lastName}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Class Adviser / Faculty</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-8">Noted By:</p>
            <div className="border-b border-slate-400 pb-1 max-w-[200px]">
              <p className="text-xs font-bold text-slate-400">[Signature Over Printed Name]</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Guidance Counselor / School Principal</p>
          </div>
        </div>
      </div>
    </div>
  );
}
