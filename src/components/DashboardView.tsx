/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LogOut, Settings2, ShieldCheck, Sun, Clock, Calendar, Compass, Clipboard, UserPlus, FileText, Table, BarChart3, TrendingUp, ArrowUpRight, ArrowDownRight, ShieldAlert, Database, Layers, Trash2, Plus, Edit, Download, CheckSquare, Square, UserCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserAccount, Report, CriticalReport } from "../types";
import AccountSettingsView from "./AccountSettingsView";
import RegisterStudentModal from "./RegisterStudentModal";
import StudentSearchModal from "./StudentSearchModal";
import CICLSearchModal from "./CICLSearchModal";
import DataAnalyticsView from "./DataAnalyticsView";
import AnecdoteChart from "./AnecdoteChart";
import SectionManagerModal from "./SectionManagerModal";
import ReportsViewerModal from "./ReportsViewerModal";
import AdviserAssignmentModal from "./AdviserAssignmentModal";
import NotificationBell from "./NotificationBell";
import { useNotification } from "./NotificationProvider";

const ciclOffenses = ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"];

const mapToCategory = (issue: string) => {
  const attendanceIssues = [
    "Habitual tardiness", 
    "Cutting classes / Unexcused absences", 
    "Truancy or Child labor", 
    "Repeated or severe cases of cutting classes"
  ];
  const academicIssues = [
    "Inattentiveness / sleeping in class", 
    "Using gadgets during class hour without permission", 
    "Copying assignments or mild cheating"
  ];
  const behavioralIssues = [
    "Talking back to teachers", 
    "Dress code violations", 
    "Minor class disturbances (e.g. noise, jokes)", 
    "Peer misunderstanding or minor peer conflicts", 
    "Vandalism (minor cases like writing on desks)", 
    "Extreme defiance of authority or insubordination", 
    "Physical altercation or Fights", 
    "Bullying (Physical, Emotional, or Cyberbullying)"
  ];
  
  if (attendanceIssues.some(i => issue.includes(i))) return "Attendance";
  if (academicIssues.some(i => issue.includes(i))) return "Academic";
  if (behavioralIssues.some(i => issue.includes(i))) return "Behavioral";
  return "Others";
};

interface DashboardViewProps {
  user: Partial<UserAccount>;
  onLogout: () => void;
  onUpdateUser: (freshUser: Partial<UserAccount>) => void;
}

export default function DashboardView({ user, onLogout, onUpdateUser }: DashboardViewProps) {
  const { notify, confirm } = useNotification();
  const [showSettings, setShowSettings] = useState(false);
  const [showRegisterStudent, setShowRegisterStudent] = useState(false);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [showCICLReport, setShowCICLReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showAdminMenu, setShowAdminMenu] = useState(false);
  const [showDatabaseActions, setShowDatabaseActions] = useState(false);
  const [showSectionManager, setShowSectionManager] = useState(false);
  const [showReportsViewer, setShowReportsViewer] = useState(false);
  const [showResolvedReportsViewer, setShowResolvedReportsViewer] = useState(false);
  const [reportsViewerQuery, setReportsViewerQuery] = useState("");
  const [showAdviserAssignment, setShowAdviserAssignment] = useState(false);
  const [chartData, setChartData] = useState<{ category: string; count: number }[]>([]);
  const [monthlyTrend, setMonthlyTrend] = useState<{ month: string; count: number }[]>([]);
  const [topStudents, setTopStudents] = useState<{ name: string; lrn: string; count: number }[]>([]);
  const [allTeacherReports, setAllTeacherReports] = useState<any[]>([]);
  const [trendData, setTrendData] = useState<{ totalChange: number; academicChange: number; behavioralChange: number }>({ totalChange: 0, academicChange: 0, behavioralChange: 0 });
  const [stats, setStats] = useState({
    dailyGeneral: 0, totalGeneral: 0,
    dailyCritical: 0, totalCritical: 0,
    dailyCICL: 0, totalCICL: 0
  });
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [selectedReports, setSelectedReports] = useState<{id: string | number, type: string}[]>([]);

  const handleSelectReport = (report: any) => {
    setSelectedReports(prev => {
      const isSelected = prev.some(r => r.id === report.id && r.type === report.type);
      if (isSelected) {
        return prev.filter(r => !(r.id === report.id && r.type === report.type));
      } else {
        return [...prev, { id: report.id, type: report.type }];
      }
    });
  };

  const handleSelectAll = (reportsInView: any[]) => {
    if (selectedReports.length === reportsInView.length) {
      setSelectedReports([]);
    } else {
      setSelectedReports(reportsInView.map(r => ({ id: r.id, type: r.type })));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedReports.length === 0) return;

    confirm({
      title: "Bulk Deletion",
      message: `Are you sure you want to permanently delete ${selectedReports.length} selected reports? This action is irreversible.`,
      confirmText: "Delete All",
      variant: "danger",
      onConfirm: async () => {
        try {
          const results = await Promise.all(selectedReports.map(report => {
            const endpoint = report.type === 'General' ? `/api/reports/${report.id}` : `/api/critical-reports/${report.id}`;
            return fetch(endpoint, { method: 'DELETE' });
          }));

          if (results.every(r => r.ok)) {
            notify("success", `${selectedReports.length} reports successfully removed.`);
            setSelectedReports([]);
            // Refresh data
            window.location.reload(); // Simple refresh for now, or I could re-fetch
          } else {
            notify("error", "Some records failed to delete.");
          }
        } catch (err) {
          notify("error", "Network error during bulk operation.");
        }
      }
    });
  };

  const handleExportSelected = () => {
    if (selectedReports.length === 0) return;

    const reportsToExport = allTeacherReports.filter(r => 
      selectedReports.some(sr => sr.id === r.id && sr.type === r.type)
    );

    const csvContent = [
      ["Type", "Date", "LRN", "Issue", "Description", "Status"],
      ...reportsToExport.map(r => [
        r.type,
        r.dateReported,
        r.studentLrn,
        r.issue,
        `"${(r.description || "").replace(/"/g, '""')}"`,
        r.recordStatus || "N/A"
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Bulk_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("success", `${selectedReports.length} records archived to CSV.`);
  };

  const fetchData = React.useCallback(async () => {
    try {
      const [reports, criticalReports, students] = await Promise.all([
        fetch("/api/reports").then(res => res.json()),
        fetch("/api/critical-reports").then(res => res.json()),
        fetch("/api/students").then(res => res.json())
      ]);
      const teacherName = `${user.firstName} ${user.lastName}`;
      // Use local date (YYYY-MM-DD) instead of UTC to match "Today's" reports correctly
      const todayStr = new Date().toLocaleDateString('en-CA');

      let filteredGeneral = reports;
      let filteredCritical = criticalReports;

      if (user.role === 'Admin' || user.role === 'Guidance') {
        // Admin and Guidance see all records across entire school
      } else if (user.role === 'Adviser') {
        // Advisers see only records of students in their assigned gradeLevel and section
        const adviserGrade = user.gradeLevel;
        const adviserSection = user.section;
        const studentMap = new Map<string, any>(students.map((s: any) => [s.lrn, s]));
        
        filteredGeneral = reports.filter((r: any) => {
          const student = studentMap.get(r.studentLrn);
          return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
        });
        
        filteredCritical = criticalReports.filter((r: any) => {
          const student = studentMap.get(r.studentLrn);
          return student && student.gradeLevel === adviserGrade && student.section === adviserSection;
        });
      } else {
        // Fallback or Non-Adviser (only see reports they reported or created)
        filteredGeneral = reports.filter((r: any) => r.reportedBy === teacherName || r.createdBy === user.email);
        filteredCritical = criticalReports.filter((r: any) => r.reportedBy === teacherName);
      }

      const teacherReports = [
        ...filteredGeneral.map((r: any) => ({ ...r, type: 'General' })),
        ...filteredCritical.map((r: any) => ({ ...r, type: 'Critical' }))
      ].sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());

      setAllTeacherReports(teacherReports);

      // Calculate Top Students
      const studentReferralCounts: Record<string, number> = {};
      teacherReports.forEach((r: any) => {
        const lrn = r.studentLrn;
        studentReferralCounts[lrn] = (studentReferralCounts[lrn] || 0) + 1;
      });

      const sortedStudents = Object.entries(studentReferralCounts)
        .map(([lrn, count]) => {
          const student = students.find((s: any) => s.lrn === lrn);
          return {
            lrn,
            count,
            name: student ? `${student.firstName} ${student.lastName}` : `Student ${lrn}`
          };
        })
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      setTopStudents(sortedStudents);

      // Calculate Stats for Counters
      const generalReports = filteredGeneral.filter((r: any) => !ciclOffenses.includes(r.issue));
      const ciclReports = filteredGeneral.filter((r: any) => ciclOffenses.includes(r.issue));
      const teacherCritical = filteredCritical;

      setStats({
        totalGeneral: generalReports.length,
        dailyGeneral: generalReports.filter((r: any) => {
          if (!r.dateReported) return false;
          const reportDate = new Date(r.dateReported).toLocaleDateString('en-CA');
          return reportDate === todayStr;
        }).length,
        totalCICL: ciclReports.length,
        dailyCICL: ciclReports.filter((r: any) => {
          if (!r.dateReported) return false;
          const reportDate = new Date(r.dateReported).toLocaleDateString('en-CA');
          return reportDate === todayStr;
        }).length,
        totalCritical: teacherCritical.length,
        dailyCritical: teacherCritical.filter((r: any) => {
          if (!r.dateReported) return false;
          const reportDate = new Date(r.dateReported).toLocaleDateString('en-CA');
          return reportDate === todayStr;
        }).length
      });

      const counts: Record<string, number> = {
        Attendance: 0,
        Academic: 0,
        Behavioral: 0,
        Others: 0
      };

      teacherReports.forEach((r: any) => {
        const category = mapToCategory(r.issue);
        counts[category]++;
      });

      setChartData(Object.entries(counts).map(([category, count]) => ({ category, count })));

      // Calculate Trends
      const now = new Date();
      const currentMonth = now.getMonth();
      const currentYear = now.getFullYear();
      
      const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
      const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

      const thisMonthReports = teacherReports.filter((r: any) => {
        const d = new Date(r.dateReported);
        return d.getMonth() === currentMonth && d.getFullYear() === currentYear;
      });

      const lastMonthReports = teacherReports.filter((r: any) => {
        const d = new Date(r.dateReported);
        return d.getMonth() === lastMonth && d.getFullYear() === lastMonthYear;
      });

      const calculateChange = (current: any[], previous: any[], filterFn?: (r: any) => boolean) => {
        const curCount = filterFn ? current.filter(filterFn).length : current.length;
        const prevCount = filterFn ? previous.filter(filterFn).length : previous.length;
        if (prevCount === 0) return curCount > 0 ? 100 : 0;
        return Math.round(((curCount - prevCount) / prevCount) * 100);
      };

      setTrendData({
        totalChange: calculateChange(thisMonthReports, lastMonthReports),
        academicChange: calculateChange(thisMonthReports, lastMonthReports, (r) => mapToCategory(r.issue) === 'Academic'),
        behavioralChange: calculateChange(thisMonthReports, lastMonthReports, (r) => mapToCategory(r.issue) === 'Behavioral')
      });

      // Calculate Monthly Trend for Academic Year (June to May)
      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
      const acYearStartMonth = 5; // June
      const acYearStartYear = now.getMonth() >= acYearStartMonth ? now.getFullYear() : now.getFullYear() - 1;
      
      const academicYearData: { month: string; count: number }[] = [];
      for (let i = 0; i < 12; i++) {
        const d = new Date(acYearStartYear, acYearStartMonth + i, 1);
        const m = d.getMonth();
        const y = d.getFullYear();
        const label = `${monthNames[m]} ${y.toString().slice(-2)}`;
        
        const count = teacherReports.filter((r: any) => {
          const rd = new Date(r.dateReported);
          return rd.getMonth() === m && rd.getFullYear() === y;
        }).length;
        
        academicYearData.push({ month: label, count });
      }
      setMonthlyTrend(academicYearData);
    } catch (err) {
      console.error(err);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredReports = allTeacherReports.filter(report => {
    const matchesSearch = 
      report.studentLrn?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.issue?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      report.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const category = mapToCategory(report.issue);
    const matchesCategory = categoryFilter === "All" || category === categoryFilter;

    return matchesSearch && matchesCategory;
  });

  return (
    <div id="dashboard-layout" className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans text-[#102604]">
      
      {/* Top Navbar */}
      <header id="dashboard-navbar" className="bg-white border-b border-slate-200 px-8 py-4 shrink-0 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ramon_Magsaysay_%28Cubao%29_High_School.svg/500px-Ramon_Magsaysay_%28Cubao%29_High_School.svg.png"
            alt="RMCHS Crest"
            className="w-12 h-12 object-contain rounded-full bg-white p-1 border-2 border-[#FFEA00] shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 id="navbar-app-title" className="serif font-serif font-bold text-[#102604] tracking-tight text-lg">RMCHS Anecdotal Portal</h1>
            <p className="text-[9px] text-[#888] font-bold font-sans uppercase tracking-widest">Faculty & Staff Sync</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex flex-wrap items-center justify-center md:justify-end gap-2">
          {(user.role === 'Admin' || user.role === 'Adviser') && (
            <button
              id="register-student-trigger"
              onClick={() => setShowRegisterStudent(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] hover:bg-slate-50 text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm"
            >
              <UserPlus size={14} className="text-[#76DA0D] group-hover:scale-110 transition-transform" />
              <span>Register</span>
            </button>
          )}
          
          {(user.role === 'Admin' || user.role === 'Adviser' || user.role === 'Guidance') && (
            <button
              onClick={() => setShowStudentSearch(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#76DA0D] hover:bg-slate-50 text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm"
            >
              <FileText size={14} className="text-[#76DA0D] group-hover:scale-110 transition-transform" />
              <span>Report</span>
            </button>
          )}

          {(user.role === 'Admin' || user.role === 'Adviser' || user.role === 'Guidance') && (
            <button
              onClick={() => setShowCICLReport(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-red-500 hover:bg-red-50/30 text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm"
            >
              <FileText size={14} className="text-red-500 group-hover:scale-110 transition-transform" />
              <span>CICL</span>
            </button>
          )}

          {(user.role === 'Admin' || user.role === 'Adviser' || user.role === 'Guidance') && (
            <button
              onClick={() => setShowAnalytics(!showAnalytics)}
              className={`group flex items-center gap-2 px-4 py-2 border font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm ${
                showAnalytics 
                ? 'bg-[#102604] text-white border-[#102604]' 
                : 'bg-white border-slate-200 hover:border-blue-500 hover:bg-blue-50/30 text-[#102604]'
              }`}
            >
              <BarChart3 size={14} className={showAnalytics ? "text-[#76DA0D]" : "text-blue-500 group-hover:scale-110 transition-transform"} />
              <span>Analytics</span>
            </button>
          )}

          <button
            id="settings-trigger"
            onClick={() => setShowSettings(true)}
            className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 hover:border-[#FFEA00] hover:bg-slate-50 text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm"
          >
            <Settings2 size={14} className="text-[#76DA0D] group-hover:rotate-45 transition-transform" />
            <span>Account</span>
          </button>

          {(user.role === 'Admin' || user.role === 'Guidance') && (
            <button
              id="view-reports-btn"
              onClick={() => setShowReportsViewer(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 font-bold text-[10px] tracking-widest uppercase transition-all hover:border-[#102604] hover:bg-slate-50 text-[#102604] cursor-pointer select-none h-10 shadow-sm"
            >
              <FileText size={14} className="text-[#102604] group-hover:scale-110 transition-transform" />
              <span>View Reports</span>
            </button>
          )}

          {(user.role === 'Admin' || user.role === 'Guidance') && (
            <button
              id="view-resolved-reports-btn"
              onClick={() => setShowResolvedReportsViewer(true)}
              className="group flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 font-bold text-[10px] tracking-widest uppercase transition-all hover:border-[#76DA0D] hover:bg-slate-50 text-[#102604] cursor-pointer select-none h-10 shadow-sm"
            >
              <FileText size={14} className="text-[#76DA0D] group-hover:scale-110 transition-transform" />
              <span>View Resolved Report</span>
            </button>
          )}

          {/* Admin Button with Dropdown */}
          {user.role === 'Admin' && (
            <div className="relative">
              <button
                id="admin-menu-trigger"
                onClick={() => setShowAdminMenu(!showAdminMenu)}
                className={`group flex items-center gap-2 px-4 py-2 border font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none h-10 min-w-[140px] justify-center shadow-sm ${
                  showAdminMenu || showDatabaseActions || showSectionManager
                  ? 'bg-[#102604] text-white border-[#102604]' 
                  : 'bg-white border-slate-200 hover:border-red-500 hover:bg-slate-50 text-[#102604]'
                }`}
              >
                <ShieldAlert size={14} className={showAdminMenu ? "text-[#76DA0D]" : "text-red-500 group-hover:scale-110 transition-transform"} />
                <span>Admin</span>
              </button>

              <AnimatePresence>
                {showAdminMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 shadow-xl z-50 py-1"
                  >
                    <button
                      onClick={() => {
                        setShowDatabaseActions(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors"
                    >
                      <Database size={14} className="text-[#76DA0D]" />
                      <span>Database</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowSectionManager(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors"
                    >
                      <Layers size={14} className="text-blue-500" />
                      <span>Sections</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowAdviserAssignment(true);
                        setShowAdminMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 text-left text-[11px] font-bold text-[#102604] uppercase tracking-wider transition-colors"
                    >
                      <UserPlus size={14} className="text-[#76DA0D]" />
                      <span>Set Adviser</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          <NotificationBell 
            user={user} 
            onSelectNotification={(lrn) => {
              setReportsViewerQuery(lrn);
              setShowReportsViewer(true);
            }} 
          />

          <button
            id="logout-btn"
            onClick={onLogout}
            className="group flex items-center gap-2 px-4 py-2 bg-[#76DA0D] hover:bg-[#88F015] text-[#102604] border border-[#FFEA00] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none shadow-sm h-10 min-w-[140px] justify-center"
          >
            <LogOut size={14} className="group-hover:translate-x-1 transition-transform" />
            <span>Logout</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <div className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
        
        {/* Right column: Expansive aesthetic blank dashboard placeholder */}
        <div id="dashboard-content-col" className="flex-1 flex flex-col gap-8">
          {showAnalytics ? (
            <DataAnalyticsView />
          ) : (
            <div>Dashboard Content</div>
          )}

                {/* New Search and Filterable Anecdote List */}
                <div className="w-full bg-white border border-slate-100 p-8 shadow-sm text-left mt-8">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-[#102604] flex items-center justify-center">
                        <Table size={14} className="text-[#76DA0D]" />
                      </div>
                      <h5 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Recent Student Anecdotes</h5>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3">
                      <AnimatePresence>
                        {selectedReports.length > 0 && (
                          <motion.div
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            className="flex items-center gap-2 pr-4 border-r border-slate-200 mr-2"
                          >
                            <span className="text-[10px] font-black uppercase text-blue-500 mr-2 tabular-nums">{selectedReports.length} Selected</span>
                            <button
                              onClick={handleExportSelected}
                              className="p-2 text-slate-400 hover:text-blue-500 transition-colors"
                              title="Export Selected"
                            >
                              <Download size={16} />
                            </button>
                            <button
                              onClick={handleDeleteSelected}
                              className="p-2 text-slate-400 hover:text-red-500 transition-colors"
                              title="Delete Selected"
                            >
                              <Trash2 size={16} />
                            </button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                      {/* Search Bar */}
                      <div className="relative">
                        <input
                          type="text"
                          placeholder="Search LRN, Issue..."
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-[11px] font-medium focus:outline-none focus:border-[#76DA0D] transition-colors w-full md:w-64"
                        />
                        <Compass className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                      </div>

                      {/* Category Filter */}
                      <select
                        value={categoryFilter}
                        onChange={(e) => setCategoryFilter(e.target.value)}
                        className="px-3 py-2 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#76DA0D] cursor-pointer"
                      >
                        <option value="All">All Categories</option>
                        <option value="Attendance">Attendance</option>
                        <option value="Academic">Academic</option>
                        <option value="Behavioral">Behavioral</option>
                        <option value="Others">Others</option>
                      </select>
                    </div>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
                          <th className="py-4 px-2 text-left w-10">
                            <button 
                              onClick={() => handleSelectAll(filteredReports.slice(0, 10))}
                              className="text-slate-300 hover:text-[#76DA0D] transition-colors"
                            >
                              {selectedReports.length === filteredReports.slice(0, 10).length && selectedReports.length > 0 
                                ? <CheckSquare size={16} className="text-[#76DA0D]" /> 
                                : <Square size={16} />
                              }
                            </button>
                          </th>
                          <th className="py-4 px-2 text-left w-24">Date</th>
                          <th className="py-4 px-2 text-left w-32">Student LRN</th>
                          <th className="py-4 px-2 text-left">Issue / Concern</th>
                          <th className="py-4 px-2 text-left w-24">Category</th>
                          <th className="py-4 px-2 text-left w-24">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {filteredReports.length > 0 ? (
                          filteredReports.slice(0, 10).map((report, idx) => {
                            const category = mapToCategory(report.issue);
                            return (
                              <motion.tr 
                                key={idx}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: idx * 0.05 }}
                                className={`group hover:bg-slate-50/50 transition-colors ${selectedReports.some(r => r.id === report.id && r.type === report.type) ? 'bg-blue-50/30' : ''}`}
                              >
                                <td className="py-4 px-2">
                                  <button 
                                    onClick={() => handleSelectReport(report)}
                                    className="text-slate-300 hover:text-[#76DA0D] transition-colors"
                                  >
                                    {selectedReports.some(r => r.id === report.id && r.type === report.type)
                                      ? <CheckSquare size={16} className="text-[#76DA0D]" /> 
                                      : <Square size={16} />
                                    }
                                  </button>
                                </td>
                                <td className="py-4 px-2 text-[10px] font-mono text-slate-500 whitespace-nowrap">{report.dateReported}</td>
                                <td className="py-4 px-2 text-[11px] font-bold text-[#102604]">{report.studentLrn}</td>
                                <td className="py-4 px-2">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="text-[11px] font-bold text-slate-900 line-clamp-1">{report.issue}</span>
                                    <span className="text-[10px] text-slate-400 line-clamp-1 italic">{report.description}</span>
                                  </div>
                                </td>
                                <td className="py-4 px-2">
                                  <span className={`text-[8px] font-black uppercase tracking-[0.15em] px-2.5 py-0.5 border ${
                                    category === 'Attendance' ? 'border-blue-200 text-blue-600 bg-blue-50' :
                                    category === 'Academic' ? 'border-orange-200 text-orange-600 bg-orange-50' :
                                    category === 'Behavioral' ? 'border-red-200 text-red-600 bg-red-50' :
                                    'border-slate-200 text-slate-500 bg-slate-50'
                                  }`}>
                                    {category}
                                  </span>
                                </td>
                                <td className="py-4 px-2">
                                  <div className="flex items-center gap-1.5">
                                    <div className={`w-1.5 h-1.5 rounded-full ${report.recordStatus === 'RESOLVED' ? 'bg-[#76DA0D]' : 'bg-orange-400'}`} />
                                    <span className="text-[9px] font-bold uppercase tracking-tight text-slate-600">{report.recordStatus || 'CRITICAL'}</span>
                                  </div>
                                </td>
                              </motion.tr>
                            );
                          })
                        ) : (
                          <tr>
                            <td colSpan={6} className="py-12 text-center text-[11px] text-slate-400 font-medium italic">
                              No anecdotes found matching your criteria.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                  
                  {filteredReports.length > 10 && (
                    <div className="mt-6 pt-6 border-t border-slate-100 flex justify-center">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Showing last 10 entries • {filteredReports.length} total results</p>
                    </div>
                  )}
                </div>

                <div className="pt-8 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-none text-[9px] font-bold uppercase tracking-wider font-sans text-slate-500">
                    <ShieldCheck size={12} className="text-slate-600" />
                    <span>Secure SH-256</span>
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-none text-[9px] font-bold uppercase tracking-wider font-sans text-slate-500">
                    <Sun size={12} className="text-slate-600 animate-pulse" />
                    <span>Session Active</span>
                  </span>
                </div>

      </div>

      {/* Account Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <AccountSettingsView
            user={user}
            onClose={() => setShowSettings(false)}
            onUpdateSuccess={(freshUser) => {
              onUpdateUser(freshUser);
            }}
          />
        )}
      </AnimatePresence>

      {/* Register Student Overlay */}
      <AnimatePresence>
        {showDatabaseActions && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#102604]/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Database size={20} className="text-[#76DA0D]" />
                  <h3 className="serif font-serif text-xl text-slate-900">Database Administration</h3>
                </div>
                <button onClick={() => setShowDatabaseActions(false)} className="text-slate-400 hover:text-slate-600 transition-colors">
                  <Settings2 size={18} />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <button
                  onClick={() => {
                    confirm({
                      title: "Clear Reports",
                      message: "Are you sure you want to clear ALL student reports? This action is permanent and cannot be undone.",
                      confirmText: "Clear All",
                      variant: "danger",
                      onConfirm: async () => {
                        try {
                          const res = await fetch("/api/admin/clear-reports", { method: "DELETE" });
                          if (res.ok) notify("success", "Institutional reports cleared successfully.");
                          else notify("error", "System failed to clear reports.");
                        } catch (e) { notify("error", "Network error during database operation."); }
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Reports</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>

                <button
                  onClick={() => {
                    confirm({
                      title: "Clear Student Registry",
                      message: "Are you sure you want to clear ALL registered students? This will remove all student records from the portal.",
                      confirmText: "Clear Registry",
                      variant: "danger",
                      onConfirm: async () => {
                        try {
                          const res = await fetch("/api/admin/clear-students", { method: "DELETE" });
                          if (res.ok) notify("success", "Student registry cleared successfully.");
                          else notify("error", "System failed to clear student registry.");
                        } catch (e) { notify("error", "Network error during registry operation."); }
                      }
                    });
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Students</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>

                <button
                  onClick={() => {
                    const email = prompt("Enter the teacher's email/username to delete:");
                    if (email) {
                      confirm({
                        title: "Delete Staff Account",
                        message: `Are you sure you want to permanently delete account: ${email}? This user will lose all access immediately.`,
                        confirmText: "Delete Account",
                        variant: "danger",
                        onConfirm: async () => {
                          try {
                            const res = await fetch(`/api/admin/delete-teacher?email=${encodeURIComponent(email)}`, { method: "DELETE" });
                            if (res.ok) notify("success", "Teacher account deleted successfully.");
                            else {
                              const data = await res.json();
                              notify("error", data.error || "Failed to delete account.");
                            }
                          } catch (e) { notify("error", "Network error during account deletion."); }
                        }
                      });
                    }
                  }}
                  className="w-full flex items-center justify-between p-4 bg-slate-50 hover:bg-red-50 border border-slate-100 hover:border-red-200 transition-all group"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 size={18} className="text-red-500" />
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Delete Teacher Account</span>
                  </div>
                  <ArrowUpRight size={14} className="text-slate-300 group-hover:text-red-500 transition-colors" />
                </button>
              </div>

              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => setShowDatabaseActions(false)}
                  className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {showSectionManager && (
          <SectionManagerModal onClose={() => setShowSectionManager(false)} />
        )}

        {showReportsViewer && (
          <ReportsViewerModal 
            onClose={() => {
              setShowReportsViewer(false);
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
          />
        )}

        {showResolvedReportsViewer && (
          <ReportsViewerModal 
            onClose={() => {
              setShowResolvedReportsViewer(false);
              setReportsViewerQuery("");
            }} 
            userEmail={user.email || ""}
            userRole={user.role}
            userGradeLevel={user.gradeLevel}
            userSection={user.section}
            userFirstName={user.firstName}
            userLastName={user.lastName}
            initialSearchQuery={reportsViewerQuery}
            showOnlyResolved={true}
          />
        )}

        {showAdviserAssignment && (
          <AdviserAssignmentModal onClose={() => setShowAdviserAssignment(false)} />
        )}

        {showRegisterStudent && (
          <RegisterStudentModal
            registeredByEmail={user.email || ""}
            onClose={() => setShowRegisterStudent(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Student Search Overlay */}
      <AnimatePresence>
        {showStudentSearch && (
          <StudentSearchModal
            userName={`${user.firstName} ${user.lastName}`}
            onClose={() => setShowStudentSearch(false)}
            onReportFiled={fetchData}
          />
        )}
      </AnimatePresence>
      
      {/* CICL Report Overlay */}
      <AnimatePresence>
        {showCICLReport && (
          <CICLSearchModal
            userName={`${user.firstName} ${user.lastName}`}
            onClose={() => setShowCICLReport(false)}
            onReportFiled={fetchData}
          />
        )}
      </AnimatePresence>
      </div>
    </div>
  );
}
