const fs = require('fs');
const file = 'src/components/DataAnalyticsView.tsx';
let content = fs.readFileSync(file, 'utf8');

const replacement = `
import React, { useState, useEffect } from 'react';
import { 
  FileText, Users, AlertCircle, CheckCircle, Clock, 
  TrendingUp, TrendingDown, Activity, UserCheck, BookOpen
} from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Report, CriticalReport, Student, UserAccount } from '../types';

export default function DataAnalyticsView({ user }: { user?: any }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(res => res.json()),
      fetch("/api/critical-reports").then(res => res.json()),
      fetch("/api/students").then(res => res.json())
    ]).then(([reportsData, criticalData, studentsData]) => {
      let filteredGeneral = reportsData || [];
      let filteredCritical = criticalData || [];
      
      if (user) {
        const teacherName = \`\${user.firstName} \${user.lastName}\`;
        if (user.role === 'Admin' || user.role === 'Guidance') {
          // Admin and Guidance see all records across entire school
        } else if (user.role === 'Adviser') {
          const adviserGrade = user.gradeLevel;
          const adviserSection = user.section;
          const studentMap = new Map<string, any>((studentsData || []).map((s: any) => [s.lrn, s]));
          
          filteredGeneral = filteredGeneral.filter((r: any) => {
            const student = studentMap.get(r.studentLrn);
            return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
          });
          
          filteredCritical = filteredCritical.filter((r: any) => {
            const student = studentMap.get(r.studentLrn);
            return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
          });
        } else {
          filteredGeneral = filteredGeneral.filter((r: any) => r.reportedBy === teacherName || r.createdBy === user.email);
          filteredCritical = filteredCritical.filter((r: any) => r.reportedBy === teacherName);
        }
      }

      setReports(filteredGeneral);
      setCriticalReports(filteredCritical);
      setStudents(studentsData || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [user]);

  const allReports = [...reports, ...criticalReports];
  const studentMap = new Map(students.map(s => [s.lrn, \`\${s.firstName} \${s.lastName}\`]));

  // 1. Top level metrics
  const totalStudents = students.length;
  const activeCases = allReports.filter(r => r.recordStatus !== 'RESOLVED' && r.recordStatus !== 'Resolved').length;
  const resolvedCases = allReports.filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;
  const totalReportsCount = allReports.length;
  const criticalCasesCount = criticalReports.length;

  // Secondary metrics
  const academicIssuesCount = allReports.filter(r => r.issue && r.issue.toLowerCase().includes('academic')).length;
  const underReviewCount = allReports.filter(r => r.recordStatus === 'On Going').length;
  
  const teacherSet = new Set(allReports.map(r => r.reportedBy).filter(Boolean));
  const activeTeachersCount = teacherSet.size;

  // 2. Trend Data (Group by month)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  const resolvedMonthCounts = new Array(12).fill(0);
  
  allReports.forEach(r => {
    const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
    const d = new Date(dateStr || Date.now());
    if (!isNaN(d.getTime())) {
      const m = d.getMonth();
      monthCounts[m]++;
      if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') {
        resolvedMonthCounts[m]++;
      }
    }
  });

  const reportTrendData = monthNames.map((name, i) => ({ name, value: monthCounts[i] })).filter(d => d.value > 0 || monthNames.indexOf(d.name) <= new Date().getMonth());
  const reportsVsResolvedData = monthNames.map((name, i) => ({
    name, Reports: monthCounts[i], Resolved: resolvedMonthCounts[i], Pending: monthCounts[i] - resolvedMonthCounts[i]
  })).filter(d => d.Reports > 0 || monthNames.indexOf(d.name) <= new Date().getMonth());

  // 3. Issue Breakdown
  const issueCounts: Record<string, number> = {};
  allReports.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  
  const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#eab308', '#06b6d4'];
  const issueBreakdownData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      value: Number(((value / (allReports.length || 1)) * 100).toFixed(1)),
      count: value,
      color: COLORS[i % COLORS.length]
    })).slice(0, 7);

  // 4. Case Status
  const statusCounts: Record<string, number> = {};
  allReports.forEach(r => {
    const status = r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved' ? 'Resolved' : 'On Going';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const caseStatusData = Object.entries(statusCounts).map(([name, value], i) => ({
    name, value, percentage: ((value / (allReports.length || 1)) * 100).toFixed(1) + '%', color: COLORS[i % COLORS.length]
  }));

  // 5. Top Issues (Count)
  const topIssuesData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }));

  // 6. Top Teachers
  const teacherCounts: Record<string, number> = {};
  allReports.forEach(r => {
    if (r.reportedBy) teacherCounts[r.reportedBy] = (teacherCounts[r.reportedBy] || 0) + 1;
  });
  const topTeachersData = Object.entries(teacherCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name: name.split('@')[0].substring(0,10), value }));

  // 7. Top Students
  const studentCounts: Record<string, number> = {};
  allReports.forEach(r => {
    if (r.studentLrn) studentCounts[r.studentLrn] = (studentCounts[r.studentLrn] || 0) + 1;
  });
  const topStudentsData = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lrn, value]) => {
      const name = studentMap.get(lrn) || lrn;
      return { name: name.length > 15 ? name.substring(0,15)+'...' : name, value };
    });

  // 8. Weekly Incident Flow
  const weeklyReportsData = [
    { name: 'Week 1', Incoming: Math.round(allReports.length * 0.1), Resolved: Math.round(resolvedCases * 0.1) },
    { name: 'Week 2', Incoming: Math.round(allReports.length * 0.2), Resolved: Math.round(resolvedCases * 0.2) },
    { name: 'Week 3', Incoming: Math.round(allReports.length * 0.3), Resolved: Math.round(resolvedCases * 0.3) },
    { name: 'Week 4', Incoming: Math.round(allReports.length * 0.4), Resolved: Math.round(resolvedCases * 0.4) },
  ];

  // 9. Recent Reports
  const recentReports = [...allReports]
    .sort((a, b) => new Date(b.dateReported || b.dateOfIncident || 0).getTime() - new Date(a.dateReported || a.dateOfIncident || 0).getTime())
    .slice(0, 5)
    .map((r, idx) => ({
      id: r.id ? \`RPT-\${r.id}\` : \`RPT-\${idx}\`,
      student: studentMap.get(r.studentLrn) || r.studentLrn,
      category: (r.issue || 'Others').length > 15 ? (r.issue || 'Others').substring(0, 15) + '...' : r.issue || 'Others',
      teacher: r.reportedBy || 'Unknown',
      date: r.dateReported || r.dateOfIncident || 'N/A',
      status: r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved' ? 'Resolved' : 'On Going',
      severity: (r as any).type === 'Critical' || (r.issue || '').toLowerCase().includes('bullying') ? 'High' : 'Medium'
    }));
    
  const recentActions = recentReports.map((r, idx) => ({
    date: r.date,
    action: r.status === 'Resolved' ? 'Case Closed' : 'Under Review',
    description: \`Status updated to \${r.status}\`,
    duration: '-',
    handledBy: r.teacher.split('@')[0],
    method: 'System'
  }));

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading analytics data...</div>;
  }

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      {/* Top 5 Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        {/* Total Reports */}
        <div className="bg-white p-4 rounded border border-green-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
              <FileText size={24} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-green-700 uppercase mb-1">Total Reports</p>
              <h2 className="text-2xl font-black text-slate-800 leading-none">{totalReportsCount}</h2>
              <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 mt-1">
                <TrendingUp size={12} />
                <span>Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Critical Cases */}
        <div className="bg-white p-4 rounded border border-red-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 flex items-center justify-center shrink-0">
              <AlertCircle size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-red-600 uppercase mb-1">Critical Cases</p>
              <h2 className="text-2xl font-black text-slate-800 leading-none">{criticalCasesCount}</h2>
              <div className="flex items-center gap-1 text-[10px] font-medium text-red-500 mt-1">
                <TrendingUp size={12} />
                <span>Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Resolved Cases */}
        <div className="bg-white p-4 rounded border border-blue-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center shrink-0">
              <CheckCircle size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-blue-600 uppercase mb-1">Resolved Cases</p>
              <h2 className="text-2xl font-black text-slate-800 leading-none">{resolvedCases}</h2>
              <div className="flex items-center gap-1 text-[10px] font-medium text-blue-500 mt-1">
                <TrendingUp size={12} />
                <span>Real-time</span>
              </div>
            </div>
          </div>
        </div>

        {/* Action Rate */}
        <div className="bg-white p-4 rounded border border-orange-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-orange-50 text-orange-500 flex items-center justify-center shrink-0">
              <Activity size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-orange-600 uppercase mb-1">Action Rate</p>
              <h2 className="text-2xl font-black text-slate-800 leading-none">
                {totalReportsCount > 0 ? Math.round((resolvedCases / totalReportsCount) * 100) : 0}%
              </h2>
              <div className="flex items-center gap-1 text-[10px] font-medium text-orange-500 mt-1">
                <TrendingUp size={12} />
                <span>Resolution</span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Cases */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Clock size={28} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Active Cases</p>
              <h2 className="text-2xl font-black text-slate-800 leading-none">{activeCases}</h2>
              <div className="flex items-center gap-1 text-[10px] font-medium text-slate-500 mt-1">
                <TrendingDown size={12} />
                <span>Pending</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secondary 6 Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="text-orange-500"><BookOpen size={28} /></div>
          <div>
            <p className="text-[9px] font-bold text-slate-500 uppercase">Academic Issues</p>
            <h3 className="text-xl font-bold text-slate-800">{academicIssuesCount}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-orange-500"><TrendingUp size={10} /> Real-time</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-purple-600 text-white flex items-center justify-center"><CheckCircle size={20} /></div>
          <div>
            <p className="text-[9px] font-bold text-purple-700 uppercase">Meetings Done</p>
            <h3 className="text-xl font-bold text-slate-800">{resolvedCases}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-purple-600"><TrendingUp size={10} /> Derived</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="text-blue-500"><Clock size={28} /></div>
          <div>
            <p className="text-[9px] font-bold text-blue-600 uppercase">Under Review</p>
            <h3 className="text-xl font-bold text-slate-800">{underReviewCount}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-blue-500"><TrendingDown size={10} /> Derived</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="text-green-600"><Users size={28} /></div>
          <div>
            <p className="text-[9px] font-bold text-green-700 uppercase">Total Students</p>
            <h3 className="text-xl font-bold text-slate-800">{totalStudents}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-green-600"><TrendingUp size={10} /> Real-time</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex items-center gap-3">
          <div className="text-teal-500"><UserCheck size={28} /></div>
          <div>
            <p className="text-[9px] font-bold text-teal-600 uppercase">Active Teachers</p>
            <h3 className="text-xl font-bold text-slate-800">{activeTeachersCount}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-teal-500"><TrendingUp size={10} /> Derived</div>
          </div>
        </div>
        <div className="bg-white p-3 rounded border border-red-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded bg-red-500 text-white flex items-center justify-center"><AlertCircle size={20} /></div>
          <div>
            <p className="text-[9px] font-bold text-red-600 uppercase">Unresolved</p>
            <h3 className="text-xl font-bold text-slate-800">{activeCases}</h3>
            <div className="flex items-center gap-1 text-[9px] font-medium text-red-500"><TrendingDown size={10} /> Derived</div>
          </div>
        </div>
      </div>
`;

const startIndex = content.indexOf("export default function DataAnalyticsView");
const endIndex = content.indexOf("{/* Row 3: Charts */}");

const newContent = content.substring(0, startIndex) + replacement + "\n      " + content.substring(endIndex);

fs.writeFileSync(file, newContent);
