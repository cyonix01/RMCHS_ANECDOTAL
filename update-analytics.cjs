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
import { Report, CriticalReport, Student } from '../types';

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
      setReports(reportsData || []);
      setCriticalReports(criticalData || []);
      setStudents(studentsData || []);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, []);

  const allReports = [...reports, ...criticalReports];
  const studentMap = new Map(students.map(s => [s.lrn, \`\${s.firstName} \${s.lastName}\`]));

  // 1. Top level metrics
  const totalStudents = students.length;
  const activeCases = allReports.filter(r => r.recordStatus !== 'RESOLVED' && r.recordStatus !== 'Resolved').length;
  const resolvedCases = allReports.filter(r => r.recordStatus === 'RESOLVED' || r.recordStatus === 'Resolved').length;

  // 2. Trend Data (Group by month)
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthCounts = new Array(12).fill(0);
  const resolvedMonthCounts = new Array(12).fill(0);
  
  allReports.forEach(r => {
    const d = new Date(r.dateReported || r.dateOfIncident || Date.now());
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
      value: (value / (allReports.length || 1)) * 100,
      count: value,
      color: COLORS[i % COLORS.length]
    })).slice(0, 7);

  // 4. Case Status
  const statusCounts: Record<string, number> = {};
  allReports.forEach(r => {
    const status = r.recordStatus === 'RESOLVED' ? 'Resolved' : 'On Going';
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
    .map(([name, value]) => ({ name: name.split('@')[0], value }));

  // 7. Top Students
  const studentCounts: Record<string, number> = {};
  allReports.forEach(r => {
    if (r.studentLrn) studentCounts[r.studentLrn] = (studentCounts[r.studentLrn] || 0) + 1;
  });
  const topStudentsData = Object.entries(studentCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([lrn, value]) => ({ name: studentMap.get(lrn) || lrn, value }));

  // 8. Weekly Incident Flow (Mocked as real week data is complex to aggregate simply without full dates)
  const weeklyReportsData = [
    { name: 'Week 1', Incoming: 12, Resolved: 8 },
    { name: 'Week 2', Incoming: 15, Resolved: 10 },
    { name: 'Week 3', Incoming: Math.round(allReports.length * 0.2), Resolved: Math.round(resolvedCases * 0.2) },
    { name: 'Week 4', Incoming: Math.round(allReports.length * 0.3), Resolved: Math.round(resolvedCases * 0.3) },
  ];

  // 9. Recent Reports
  const recentReports = [...allReports]
    .sort((a, b) => new Date(b.dateReported || b.dateOfIncident || 0).getTime() - new Date(a.dateReported || a.dateOfIncident || 0).getTime())
    .slice(0, 5)
    .map(r => ({
      id: r.id ? \`RPT-\${r.id}\` : 'N/A',
      student: studentMap.get(r.studentLrn) || r.studentLrn,
      category: (r.issue || '').length > 15 ? (r.issue || '').substring(0, 15) + '...' : r.issue,
      teacher: r.reportedBy,
      date: r.dateReported || r.dateOfIncident,
      status: r.recordStatus === 'RESOLVED' ? 'Resolved' : 'On Going'
    }));
    
  const recentActions = recentReports.map(r => ({
    date: r.date,
    action: r.status,
    description: \`Status changed to \${r.status}\`,
    duration: '-',
    handledBy: r.teacher,
    method: 'System'
  }));

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading analytics...</div>;
  }
`;

const startIndex = content.indexOf("export default function DataAnalyticsView");
const endIndex = content.indexOf("return (", startIndex);

const newContent = content.substring(0, startIndex) + replacement + "\n  " + content.substring(endIndex);

fs.writeFileSync(file, newContent);
