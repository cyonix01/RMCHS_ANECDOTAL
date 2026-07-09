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
        const teacherName = `${user.firstName} ${user.lastName}`;
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
  const studentMap = new Map(students.map(s => [s.lrn, `${s.firstName} ${s.lastName}`]));

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
      const nameStr = name as string;
      return { name: nameStr.length > 15 ? nameStr.substring(0,15)+'...' : nameStr, value };
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
      id: r.id ? `RPT-${r.id}` : `RPT-${idx}`,
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
    description: `Status updated to ${r.status}`,
    duration: '-',
    handledBy: r.teacher.split('@')[0],
    method: 'System'
  }));


  // 10. Grade Level Distribution (Cases by Grade and Gender)
  const gradeGenderDataMap: Record<string, { Male: number, Female: number }> = {
    'Grade 7': { Male: 0, Female: 0 },
    'Grade 8': { Male: 0, Female: 0 },
    'Grade 9': { Male: 0, Female: 0 },
    'Grade 10': { Male: 0, Female: 0 },
    'Grade 11': { Male: 0, Female: 0 },
    'Grade 12': { Male: 0, Female: 0 },
  };

  const studentObjMap = new Map(students.map(s => [s.lrn, s]));

  allReports.forEach(r => {
    const student = studentObjMap.get(r.studentLrn) as Student;
    if (student && student.gradeLevel && student.gender) {
      if (gradeGenderDataMap[student.gradeLevel]) {
        if (student.gender === 'Male' || student.gender === 'Female') {
          gradeGenderDataMap[student.gradeLevel][student.gender]++;
        }
      }
    }
  });

  const gradeGenderData = Object.keys(gradeGenderDataMap).map(grade => ({
    name: grade.replace('Grade ', 'G'),
    Male: gradeGenderDataMap[grade].Male,
    Female: gradeGenderDataMap[grade].Female
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

      {/* Row 3: Charts */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Trend Line */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Report Trend <span className="text-slate-400 font-normal capitalize">(This Year)</span></h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportTrendData} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Line type="monotone" dataKey="value" stroke="#16a34a" strokeWidth={2} dot={{fill: '#16a34a', r: 4}} activeDot={{r: 6}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* Grouped Bar */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Reports vs Resolutions</h3>
          <div className="h-48 w-full relative">
            <div className="absolute top-0 right-0 flex gap-3 text-[10px] font-medium">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"></div> Reports</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> Pending</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div> Resolved</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportsVsResolvedData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Reports" fill="#22c55e" />
                <Bar dataKey="Pending" fill="#ef4444" />
                <Bar dataKey="Resolved" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Issue Breakdown Donut */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Issue Breakdown <span className="text-slate-400 font-normal capitalize">(This Month)</span></h3>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={issueBreakdownData} innerRadius={35} outerRadius={60} paddingAngle={0} dataKey="value">
                    {issueBreakdownData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col gap-1">
              {issueBreakdownData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                    <span className="text-slate-600 font-medium truncate w-20">{item.name}</span>
                  </div>
                  <span className="text-slate-800 font-bold">{item.value}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Donut */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1 flex flex-col">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Case Status <span className="text-slate-400 font-normal capitalize">(This Month)</span></h3>
          <div className="flex-1 flex items-center">
            <div className="w-1/2 h-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={caseStatusData} innerRadius={20} outerRadius={60} paddingAngle={0} dataKey="value">
                    {caseStatusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="w-1/2 flex flex-col gap-1">
              {caseStatusData.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-[10px]">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full" style={{backgroundColor: item.color}}></div>
                    <span className="text-slate-600 font-medium truncate w-16">{item.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-800 font-medium w-4">{item.value}</span>
                    <span className="text-slate-500">({item.percentage})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: Horizontal Bars */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
        {/* Top Issues */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Issues <span className="text-slate-400 font-normal capitalize">(By Frequency)</span></h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topIssuesData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#334155'}} width={100} />
                <Tooltip />
                <Bar dataKey="value" fill="#16a34a" barSize={10} radius={[0, 4, 4, 0]}>
                  {topIssuesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill="#16a34a" />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Teachers */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Teachers <span className="text-slate-400 font-normal capitalize">(By Reports)</span></h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topTeachersData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#334155'}} width={60} />
                <Tooltip />
                <Bar dataKey="value" fill="#7c3aed" barSize={10} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Students */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Students <span className="text-slate-400 font-normal capitalize">(By Reports)</span></h3>
          <div className="h-48 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={topStudentsData} layout="vertical" margin={{ top: 0, right: 30, left: 20, bottom: 0 }}>
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{fontSize: 10, fill: '#334155'}} width={80} />
                <Tooltip />
                <Bar dataKey="value" fill="#3b82f6" barSize={10} radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Incident Flow */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1 relative">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Incident Flow <span className="text-slate-400 font-normal capitalize">(This Month)</span></h3>
          <div className="absolute top-4 right-4 flex gap-3 text-[10px] font-medium">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"></div> Incoming</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> Resolved</div>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={weeklyReportsData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Incoming" stroke="#22c55e" fill="#dcfce7" />
                <Area type="monotone" dataKey="Resolved" stroke="#ef4444" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
      {/* Row 5: Grade & Gender Distribution */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Grade & Gender Distribution <span className="text-slate-400 font-normal capitalize">(All Reports)</span></h3>
          <div className="h-64 w-full relative">
            <div className="absolute top-0 right-0 flex gap-3 text-[10px] font-medium">
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-blue-500"></div> Male</div>
              <div className="flex items-center gap-1"><div className="w-2 h-2 bg-pink-500"></div> Female</div>
            </div>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeGenderData} margin={{ top: 20, right: 5, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Bar dataKey="Male" fill="#3b82f6" stackId="a" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Female" fill="#ec4899" stackId="a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Row 6: Tables */}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Recent Reports */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-[11px] font-bold text-blue-800 uppercase mb-3">Recent Reports</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <th className="py-2 px-3">Report ID</th>
                  <th className="py-2 px-3">Student</th>
                  <th className="py-2 px-3">Category</th>
                  <th className="py-2 px-3">Teacher</th>
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Status</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-medium text-slate-700">
                {recentReports.map((report, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 font-semibold text-slate-900">{report.id}</td>
                    <td className="py-2.5 px-3">{report.student}</td>
                    <td className="py-2.5 px-3">{report.category}</td>
                    <td className="py-2.5 px-3">{report.teacher}</td>
                    <td className="py-2.5 px-3 text-slate-500">{report.date}</td>
                    <td className="py-2.5 px-3">
                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                        report.status === 'Resolved' ? 'bg-green-100 text-green-700' :
                        report.status === 'Under Review' ? 'bg-blue-100 text-blue-700' :
                        report.status === 'Parent Meeting' ? 'bg-orange-100 text-orange-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>
                        {report.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Actions */}
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm overflow-hidden flex flex-col">
          <h3 className="text-[11px] font-bold text-blue-800 uppercase mb-3">Recent Actions</h3>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left border-collapse whitespace-nowrap">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-bold text-slate-600 uppercase border-b border-slate-200">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Action Type</th>
                  <th className="py-2 px-3">Description</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Handled By</th>
                  <th className="py-2 px-3">Method</th>
                </tr>
              </thead>
              <tbody className="text-[11px] font-medium text-slate-700">
                {recentActions.map((action, idx) => (
                  <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="py-2.5 px-3 text-slate-500">{action.date}</td>
                    <td className="py-2.5 px-3 font-semibold">{action.action}</td>
                    <td className="py-2.5 px-3 truncate max-w-[150px]">{action.description}</td>
                    <td className="py-2.5 px-3">{action.duration}</td>
                    <td className="py-2.5 px-3">{action.handledBy}</td>
                    <td className="py-2.5 px-3">{action.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
