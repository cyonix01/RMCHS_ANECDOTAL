import React, { useState, useEffect } from 'react';
import { FileText, Users, AlertCircle, CheckCircle, Clock, TrendingUp, TrendingDown, Activity, UserCheck, BookOpen, Download, Printer } from 'lucide-react';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, 
  Legend, ResponsiveContainer 
} from 'recharts';
import { Report, CriticalReport, Student, UserAccount } from '../types';
import { exportToCSV } from '../utils/exportCSV';
import { generateAnalyticsPDF } from '../utils/pdfGenerator';

export default function DataAnalyticsView({ user }: { user?: any }) {
  const [reports, setReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
const [loading, setLoading] = useState(true);
  const [timeFilter, setTimeFilter] = useState<'Daily' | 'Weekly' | 'Monthly' | 'Yearly'>('Monthly');
  const [studentGradeFilter, setStudentGradeFilter] = useState<string>('All');
  const [reportTypeFilter, setReportTypeFilter] = useState<'All' | 'General' | 'Critical' | 'CICL'>('All');
  const [generatingPdf, setGeneratingPdf] = useState(false);

  const fetchData = (showLoading = true) => {
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
      if (showLoading) setLoading(false);
    }).catch(err => {
      if (err instanceof Error && err.message === "Failed to fetch") {
        if (showLoading) setLoading(false);
        return; // Silent on network error during polling
      }
      console.error("Analytics fetch error:", err);
      if (showLoading) setLoading(false);
    });
  };

  useEffect(() => {
    setLoading(true);
    fetchData(true);
    const interval = setInterval(() => fetchData(false), 10000);
    return () => clearInterval(interval);
  }, [user]);



  const getFilteredReportsRaw = () => {
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

  const allReportsRaw = getFilteredReportsRaw();
  const allReports = studentGradeFilter === 'All' 
    ? allReportsRaw 
    : allReportsRaw.filter(r => {
        const student = students.find(s => s.lrn === r.studentLrn);
        return student && student.gradeLevel === studentGradeFilter;
      });
  const studentMap = new Map(students.map(s => [s.lrn, `${s.firstName} ${s.lastName}`]));

// 1. Top level metrics
  const filteredStudents = studentGradeFilter === 'All' ? students : students.filter(s => s.gradeLevel === studentGradeFilter);
  const totalStudents = filteredStudents.length;
  const maleStudents = filteredStudents.filter(s => s.gender === 'Male').length;
  const femaleStudents = filteredStudents.filter(s => s.gender === 'Female').length;
  const activeCases = allReports.filter(r => r.recordStatus !== 'RESOLVED' && r.recordStatus !== 'Resolved').length;
  const resolvedCases = allReports.filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;
  const totalReportsCount = allReports.length;

  const activeCriticalReports = (reportTypeFilter === 'All' || reportTypeFilter === 'Critical')
    ? (studentGradeFilter === 'All' 
        ? criticalReports 
        : criticalReports.filter(r => {
            const student = students.find(s => s.lrn === r.studentLrn);
            return student && student.gradeLevel === studentGradeFilter;
          }))
    : [];
  const criticalCasesCount = activeCriticalReports.length;

  // Calculate This Month and Today
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  let reportsThisMonth = 0;
  let reportsToday = 0;
  let criticalThisMonth = 0;
  let criticalToday = 0;
  let resolvedThisMonth = 0;
  let resolvedToday = 0;

  allReports.forEach(r => {
    const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now()).getTime();
    if (d >= startOfMonth) reportsThisMonth++;
    if (d >= startOfDay) reportsToday++;
    if ((r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') && d >= startOfMonth) resolvedThisMonth++;
    if ((r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') && d >= startOfDay) resolvedToday++;
  });

  activeCriticalReports.forEach(r => {
    const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now()).getTime();
    if (d >= startOfMonth) criticalThisMonth++;
    if (d >= startOfDay) criticalToday++;
  });

    // Secondary metrics
  const academicIssuesCount = allReports.filter(r => r.issue && r.issue.toLowerCase().includes('academic')).length;
  const underReviewCount = allReports.filter(r => r.recordStatus === 'On Going').length;
  
  const teacherSet = new Set(allReports.map(r => r.reportedBy).filter(Boolean));
  const activeTeachersCount = teacherSet.size;

  // 2. Trend Data (Dynamic based on timeFilter)
  let reportTrendData: { name: string, value: number }[] = [];
  let reportsVsResolvedData: { name: string, Reports: number, Resolved: number, Pending: number }[] = [];

  if (timeFilter === 'Monthly') {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthCounts = new Array(12).fill(0);
    const resolvedMonthCounts = new Array(12).fill(0);
    
    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime())) {
        const m = d.getMonth();
        monthCounts[m]++;
        if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedMonthCounts[m]++;
      }
    });
    
    reportTrendData = monthNames.map((name, i) => ({ name, value: monthCounts[i] })).filter((d, i) => d.value > 0 || i <= new Date().getMonth());
    reportsVsResolvedData = monthNames.map((name, i) => ({
      name, Reports: monthCounts[i], Resolved: resolvedMonthCounts[i], Pending: monthCounts[i] - resolvedMonthCounts[i]
    })).filter((d, i) => d.Reports > 0 || i <= new Date().getMonth());
  } else if (timeFilter === 'Daily') {
    // Last 7 days
    const days = 7;
    const dayNames = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dayNames.push(d.toLocaleDateString('en-US', { weekday: 'short' }));
    }
    const dayCounts = new Array(days).fill(0);
    const resolvedDayCounts = new Array(days).fill(0);

    const today = new Date();
    today.setHours(23, 59, 59, 999);
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - (days - 1));
    cutoff.setHours(0, 0, 0, 0);

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime()) && d >= cutoff && d <= today) {
        const diffTime = Math.abs(today.getTime() - d.getTime());
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const idx = (days - 1) - diffDays;
        if (idx >= 0 && idx < days) {
          dayCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedDayCounts[idx]++;
        }
      }
    });

    reportTrendData = dayNames.map((name, i) => ({ name, value: dayCounts[i] }));
    reportsVsResolvedData = dayNames.map((name, i) => ({
      name, Reports: dayCounts[i], Resolved: resolvedDayCounts[i], Pending: dayCounts[i] - resolvedDayCounts[i]
    }));
  } else if (timeFilter === 'Weekly') {
    // Last 4 weeks
    const weeks = 4;
    const weekNames = ['Week 1', 'Week 2', 'Week 3', 'Week 4'];
    const weekCounts = new Array(weeks).fill(0);
    const resolvedWeekCounts = new Array(weeks).fill(0);

    const today = new Date();
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28); // 4 weeks

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime()) && d > cutoff && d <= today) {
        const diffTime = today.getTime() - d.getTime();
        const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7));
        const idx = (weeks - 1) - diffWeeks;
        if (idx >= 0 && idx < weeks) {
          weekCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedWeekCounts[idx]++;
        }
      }
    });

    reportTrendData = weekNames.map((name, i) => ({ name, value: weekCounts[i] }));
    reportsVsResolvedData = weekNames.map((name, i) => ({
      name, Reports: weekCounts[i], Resolved: resolvedWeekCounts[i], Pending: weekCounts[i] - resolvedWeekCounts[i]
    }));
  } else if (timeFilter === 'Yearly') {
    // Last 5 years
    const years = 5;
    const currentYear = new Date().getFullYear();
    const yearNames = [];
    for (let i = years - 1; i >= 0; i--) {
      yearNames.push((currentYear - i).toString());
    }
    const yearCounts = new Array(years).fill(0);
    const resolvedYearCounts = new Array(years).fill(0);

    allReports.forEach(r => {
      const dateStr = r.dateReported || r.dateOfIncident || r.createdAt;
      const d = new Date(dateStr || Date.now());
      if (!isNaN(d.getTime())) {
        const y = d.getFullYear();
        const diffYears = currentYear - y;
        const idx = (years - 1) - diffYears;
        if (idx >= 0 && idx < years) {
          yearCounts[idx]++;
          if (r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved') resolvedYearCounts[idx]++;
        }
      }
    });

    reportTrendData = yearNames.map((name, i) => ({ name, value: yearCounts[i] }));
    reportsVsResolvedData = yearNames.map((name, i) => ({
      name, Reports: yearCounts[i], Resolved: resolvedYearCounts[i], Pending: yearCounts[i] - resolvedYearCounts[i]
    }));
  }

  
  // Filter for downstream charts
  let filteredReports = allReports;
  const filterToday = new Date();
  filterToday.setHours(23, 59, 59, 999);

  if (timeFilter === 'Daily') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 6);
    cutoff.setHours(0, 0, 0, 0);
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d >= cutoff && d <= filterToday;
    });
  } else if (timeFilter === 'Weekly') {
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 28);
    cutoff.setHours(0, 0, 0, 0);
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d > cutoff && d <= filterToday;
    });
  } else if (timeFilter === 'Monthly') {
    const currentYear = filterToday.getFullYear();
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d.getFullYear() === currentYear;
    });
  } else if (timeFilter === 'Yearly') {
    const cutoffYear = filterToday.getFullYear() - 4;
    filteredReports = allReports.filter(r => {
      const d = new Date(r.dateReported || r.dateOfIncident || r.createdAt || Date.now());
      return !isNaN(d.getTime()) && d.getFullYear() >= cutoffYear;
    });
  }

  const timeLabel = timeFilter === 'Daily' ? 'Last 7 Days' : timeFilter === 'Weekly' ? 'Last 4 Weeks' : timeFilter === 'Monthly' ? 'This Year' : 'Last 5 Years';

  // 3. Issue Breakdown
  const issueCounts: Record<string, number> = {};
  filteredReports.forEach(r => {
    const issue = r.issue || 'Others';
    issueCounts[issue] = (issueCounts[issue] || 0) + 1;
  });
  
  const COLORS = ['#f97316', '#ef4444', '#3b82f6', '#10b981', '#8b5cf6', '#eab308', '#06b6d4'];
  const issueBreakdownData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([name, value], i) => ({
      name: name.length > 20 ? name.substring(0, 20) + '...' : name,
      value: Number(((value / (filteredReports.length || 1)) * 100).toFixed(1)),
      count: value,
      color: COLORS[i % COLORS.length]
    })).slice(0, 7);

  // 4. Case Status
  const statusCounts: Record<string, number> = {};
  filteredReports.forEach(r => {
    const status = r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved' ? 'Resolved' : 'On Going';
    statusCounts[status] = (statusCounts[status] || 0) + 1;
  });
  const caseStatusData = Object.entries(statusCounts).map(([name, value], i) => ({
    name, value, percentage: ((value / (filteredReports.length || 1)) * 100).toFixed(1) + '%', color: COLORS[i % COLORS.length]
  }));

  // 5. Top Issues (Count)
  const topIssuesData = Object.entries(issueCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name, value]) => ({ name: name.length > 15 ? name.substring(0, 15) + '...' : name, value }));

  // 6. Top Teachers
  const teacherCounts: Record<string, number> = {};
  filteredReports.forEach(r => {
    if (r.reportedBy) teacherCounts[r.reportedBy] = (teacherCounts[r.reportedBy] || 0) + 1;
  });
  const topTeachersData = Object.entries(teacherCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([name, value]) => ({ name: name.split('@')[0].substring(0,10), value }));

  // 7. Top Students
  const studentCounts: Record<string, number> = {};
  filteredReports.forEach(r => {
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

  // 9. Recent Reports
  const recentReports = [...filteredReports]
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

  filteredReports.forEach(r => {
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

  const gradesList = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'];
  const gradeBreakdownStats = gradesList.map(grade => {
    const gradeStudents = students.filter(s => s.gradeLevel === grade);
    const studentLrnSet = new Set(gradeStudents.map(s => s.lrn));
    
    const gradeGeneral = reports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCritical = criticalReports.filter(r => studentLrnSet.has(r.studentLrn));
    const gradeCICL = reports.filter(r => studentLrnSet.has(r.studentLrn) && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue));
    
    const totalReports = gradeGeneral.length + gradeCritical.length;
    const resolved = [...gradeGeneral, ...gradeCritical].filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;
    const resolutionRate = totalReports > 0 ? Math.round((resolved / totalReports) * 100) : 100;

    return {
      grade,
      studentsCount: gradeStudents.length,
      generalCount: gradeGeneral.length - gradeCICL.length,
      criticalCount: gradeCritical.length,
      ciclCount: gradeCICL.length,
      totalReports,
      resolutionRate
    };
  });

  
  const handleExport = () => {
    const exportData = allReports.map(r => {
      const student = students.find(s => s.lrn === r.studentLrn);
      return {
        'Student LRN': r.studentLrn,
        'Student Name': student ? `${student.firstName} ${student.lastName}` : 'Unknown',
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
      exportToCSV(`Analytics_Report_${studentGradeFilter}_${timeFilter}.csv`, exportData);
    } else {
      alert("No reports available to download.");
    }
  };

  const handleDownloadPDF = async () => {
    setGeneratingPdf(true);
    try {
      await generateAnalyticsPDF(user, studentGradeFilter, reportTypeFilter, students, reports, criticalReports);
    } catch (e) {
      console.error("Error generating PDF:", e);
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500 font-medium">Loading analytics data...</div>;
  }

  return (
    <div className="p-4 bg-slate-50 min-h-screen font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-xl font-bold text-[#102604]">School Analytics & Insights</h3>
          <p className="text-sm font-medium text-slate-500">Comprehensive overview of incident reports</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer shadow-sm rounded-sm"
          >
            <Download size={14} className="text-[#76DA0D]" />
            <span>Download CSV Report</span>
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

      {/* Top 5 Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
        {/* Total Reports */}
        <div className="bg-white p-4 rounded border border-green-200 shadow-sm flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-green-600 flex items-center justify-center text-white shrink-0">
                <FileText size={20} />
              </div>
              <p className="text-[10px] font-bold text-green-700 uppercase">Total Reports</p>
            </div>
            <select
              value={reportTypeFilter}
              onChange={(e) => setReportTypeFilter(e.target.value as any)}
              className="text-[9px] border border-slate-200 rounded p-1 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer font-bold"
            >
              <option value="All">All Types</option>
              <option value="General">General</option>
              <option value="Critical">Critical</option>
              <option value="CICL">CICL</option>
            </select>
          </div>
          <div>
            <h2 className="text-3xl font-black text-slate-800 leading-none">{totalReportsCount}</h2>
            <div className="flex items-center gap-1 text-[10px] font-medium text-green-600 mt-2">
              <TrendingUp size={12} />
              <span>+{reportsThisMonth} this month, +{reportsToday} today</span>
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
                <span>+{criticalThisMonth} this month, +{criticalToday} today</span>
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
                <span>+{resolvedThisMonth} this month, +{resolvedToday} today</span>
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
        <div className="bg-white p-3 rounded border border-slate-200 shadow-sm flex flex-col gap-2">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <div className="text-green-600"><Users size={20} /></div>
              <p className="text-[9px] font-bold text-green-700 uppercase">Total Students</p>
            </div>
            <select
              value={studentGradeFilter}
              onChange={(e) => setStudentGradeFilter(e.target.value)}
              className="text-[9px] border border-slate-200 rounded p-0.5 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option value="All">All</option>
              <option value="Grade 7">Grade 7</option>
              <option value="Grade 8">Grade 8</option>
              <option value="Grade 9">Grade 9</option>
              <option value="Grade 10">Grade 10</option>
              <option value="Grade 11">Grade 11</option>
              <option value="Grade 12">Grade 12</option>
            </select>
          </div>
          
          <div className="flex items-end gap-3">
            <h3 className="text-2xl font-bold text-slate-800 leading-none">{totalStudents}</h3>
            <div className="flex flex-col gap-0.5 mb-0.5">
              <span className="text-[9px] font-medium text-blue-600 leading-none">M: {maleStudents}</span>
              <span className="text-[9px] font-medium text-pink-600 leading-none">F: {femaleStudents}</span>
            </div>
          </div>
          <div className="flex items-center gap-1 text-[9px] font-medium text-green-600 mt-1"><TrendingUp size={10} /> Real-time</div>
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
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[11px] font-bold text-slate-700 uppercase">Report Trend</h3>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value as any)}
              className="text-[10px] border border-slate-200 rounded p-1 outline-none text-slate-600 bg-slate-50 hover:bg-slate-100 cursor-pointer"
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Monthly">Monthly</option>
              <option value="Yearly">Yearly</option>
            </select>
          </div>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Issue Breakdown <span className="text-slate-400 font-normal capitalize">({timeLabel})</span></h3>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Case Status <span className="text-slate-400 font-normal capitalize">({timeLabel})</span></h3>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Issues <span className="text-slate-400 font-normal capitalize">(By Frequency - {timeLabel})</span></h3>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Teachers <span className="text-slate-400 font-normal capitalize">(By Reports - {timeLabel})</span></h3>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Top Students <span className="text-slate-400 font-normal capitalize">(By Reports - {timeLabel})</span></h3>
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
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-2">Incident Flow <span className="text-slate-400 font-normal capitalize">({timeLabel})</span></h3>
          <div className="absolute top-4 right-4 flex gap-3 text-[10px] font-medium">
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-green-500"></div> Incoming</div>
            <div className="flex items-center gap-1"><div className="w-2 h-2 bg-red-500"></div> Resolved</div>
          </div>
          <div className="h-48 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={reportsVsResolvedData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <YAxis tick={{fontSize: 10}} tickLine={false} axisLine={false} />
                <Tooltip />
                <Area type="monotone" dataKey="Reports" stroke="#22c55e" fill="#dcfce7" />
                <Area type="monotone" dataKey="Resolved" stroke="#ef4444" fill="#fee2e2" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      
      {/* Row 5: Grade & Gender Distribution */}
      <div className="grid grid-cols-1 gap-4 mb-4">
        <div className="bg-white p-4 rounded border border-slate-200 shadow-sm col-span-1">
          <h3 className="text-[11px] font-bold text-slate-700 uppercase mb-4">Grade & Gender Distribution <span className="text-slate-400 font-normal capitalize">({timeLabel})</span></h3>
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
          <h2 className="text-xl font-black uppercase text-slate-900 tracking-wide">School-Wide Behavioral Analytics & Incident Report Summary</h2>
          <p className="text-xs text-slate-500 font-bold">Scope: {studentGradeFilter === 'All' ? 'All Grade Levels (Grade 7 - 12)' : studentGradeFilter}</p>
          <p className="text-[10px] text-slate-400 mt-1 font-medium">Report generated on {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>

        {/* Report Filtering Status */}
        <div className="grid grid-cols-2 gap-4 mb-6 bg-slate-50 p-3 rounded border border-slate-100">
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Authorized Personnel</p>
            <p className="text-xs font-bold text-slate-700">{user?.firstName} {user?.lastName} ({user?.role})</p>
          </div>
          <div>
            <p className="text-[9px] uppercase tracking-wider text-slate-400 font-bold">Report Type Filtering</p>
            <p className="text-xs font-bold text-slate-700">{reportTypeFilter === 'All' ? 'All Incident Classifications (General, Critical, & CICL)' : `${reportTypeFilter} Reports Only`}</p>
          </div>
        </div>

        {/* Executive Summary Metrics */}
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">I. School Summary Overview</h3>
        <div className="grid grid-cols-5 gap-4 mb-6">
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Total Students</p>
            <h4 className="text-xl font-black text-slate-800">{totalStudents}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Logged Cases</p>
            <h4 className="text-xl font-black text-slate-800">{totalReportsCount}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Active/Pending</p>
            <h4 className="text-xl font-black text-slate-800">{activeCases}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Resolved Cases</p>
            <h4 className="text-xl font-black text-slate-800">{resolvedCases}</h4>
          </div>
          <div className="print-card text-center">
            <p className="text-[9px] font-bold text-slate-500 uppercase">Resolution Rate</p>
            <h4 className="text-xl font-black text-slate-800">{totalReportsCount > 0 ? Math.round((resolvedCases / totalReportsCount) * 100) : 100}%</h4>
          </div>
        </div>

        {/* Detailed Grade Level Distribution */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">II. Grade-by-Grade Incident Breakdown</h3>
          <p className="text-[10px] text-slate-500 mb-3">Summary statistics per academic grade level for active registry.</p>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-2 font-bold">Grade Level</th>
                <th className="p-2 font-bold text-center">Total Students</th>
                <th className="p-2 font-bold text-center">General Reports</th>
                <th className="p-2 font-bold text-center">Critical Reports</th>
                <th className="p-2 font-bold text-center">CICL Reports</th>
                <th className="p-2 font-bold text-center">Total Incidents</th>
                <th className="p-2 font-bold text-center">Resolution %</th>
              </tr>
            </thead>
            <tbody>
              {gradeBreakdownStats.map((stat) => (
                <tr key={stat.grade} className="border-b border-slate-100">
                  <td className="p-2 font-bold text-slate-700">{stat.grade}</td>
                  <td className="p-2 text-center text-slate-600">{stat.studentsCount}</td>
                  <td className="p-2 text-center text-slate-600">{stat.generalCount}</td>
                  <td className="p-2 text-center text-red-600">{stat.criticalCount}</td>
                  <td className="p-2 text-center text-orange-600">{stat.ciclCount}</td>
                  <td className="p-2 text-center font-bold text-slate-800">{stat.totalReports}</td>
                  <td className="p-2 text-center font-semibold text-slate-700">{stat.resolutionRate}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Types of Reports Classification breakdown */}
        <div className="print-page-break pt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">III. Offense / Issue Classification Breakdown</h3>
          <p className="text-[10px] text-slate-500 mb-3">Detailed categorization of offenses reported across selected filters.</p>
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-2 font-bold">Issue / Offense Type</th>
                <th className="p-2 font-bold text-center">Incident Count</th>
                <th className="p-2 font-bold text-right">Percentage Ratio</th>
              </tr>
            </thead>
            <tbody>
              {issueBreakdownData.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-2 text-slate-400 italic text-center">No reports matching selected filters</td>
                </tr>
              ) : (
                issueBreakdownData.map((item, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-2 font-medium text-slate-700">{item.name}</td>
                    <td className="p-2 text-center font-bold text-slate-800">{item.count}</td>
                    <td className="p-2 text-right font-semibold text-slate-600">{item.value}%</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Detailed Incident Log Table */}
        <div className="mt-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 mb-3 border-b pb-1">IV. Detailed Recent Case Incident Log</h3>
          <p className="text-[10px] text-slate-500 mb-3">Roster of the 10 most recent incidents matching filtering criteria.</p>
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300">
                <th className="p-1.5 font-bold">Incident ID</th>
                <th className="p-1.5 font-bold">Date</th>
                <th className="p-1.5 font-bold">Student Name</th>
                <th className="p-1.5 font-bold">Issue / Offense</th>
                <th className="p-1.5 font-bold">Reported By</th>
                <th className="p-1.5 font-bold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentReports.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-1.5 text-slate-400 italic text-center">No active reports recorded</td>
                </tr>
              ) : (
                recentReports.slice(0, 10).map((r, idx) => (
                  <tr key={idx} className="border-b border-slate-100">
                    <td className="p-1.5 font-mono text-slate-500">{r.id}</td>
                    <td className="p-1.5 text-slate-600">{r.date}</td>
                    <td className="p-1.5 font-bold text-slate-700">{r.student}</td>
                    <td className="p-1.5 text-slate-700">{r.category}</td>
                    <td className="p-1.5 text-slate-600">{r.teacher}</td>
                    <td className="p-1.5 font-bold text-slate-800">{r.status}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Signatures */}
        <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-2 gap-12">
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-8">Prepared By:</p>
            <div className="border-b border-slate-400 pb-1 max-w-[200px]">
              <p className="text-xs font-bold text-slate-800">{user?.firstName} {user?.lastName}</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Guidance Staff / Administrator</p>
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-400 font-bold mb-8">Approved By:</p>
            <div className="border-b border-slate-400 pb-1 max-w-[200px]">
              <p className="text-xs font-bold text-slate-400">[Signature Over Printed Name]</p>
            </div>
            <p className="text-[10px] text-slate-500 mt-1">School Principal / High Authority</p>
          </div>
        </div>
      </div>
    </div>
  );
}
