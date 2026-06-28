import React, { useState, useEffect } from "react";
import { AlertTriangle, FileText, Clipboard, Users, TrendingUp } from "lucide-react";
import { Student, Report, CriticalReport, UserAccount } from "../types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";

const GRADE_LEVELS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10', 'Grade 11', 'Grade 12'] as const;

const STUDENT_REPORT_ISSUES = [
  "Habitual tardiness", "Inattentiveness / sleeping in class", "Talking back to teachers", 
  "Dress code violations", "Using gadgets during class hour without permission", 
  "Minor class disturbances (e.g. noise, jokes)", "Cutting classes / Unexcused absences", 
  "Copying assignments or mild cheating", "Peer misunderstanding or minor peer conflicts", 
  "Lack of hygiene or cleanliness issues", "Vandalism (minor cases like writing on desks)", "Others (please specify)"
];

const CRITICAL_INCIDENT_ISSUES = [
  "Teenage pregnancy or Pregnancy-related counseling and concerns",
  "Suicidal attempts or Suicidal ideation",
  "Bullying (Physical, Emotional, or Cyberbullying)",
  "Self-harm or Self-injury",
  "Physical abuse or Domestic violence",
  "Substance abuse (alcohol, drugs, vaping)",
  "Sexual harassment or Abuse (verbal, physical)",
  "Truancy or Child labor",
  "Physical altercation or Fights",
  "Possession of deadly weapon or dangerous items",
  "Repeated or severe cases of cutting classes",
  "Online exploitation or inappropriate online behavior",
  "Involvement in gangs or illegal activities",
  "Extreme defiance of authority or insubordination",
  "Others (please specify)"
];

const CICL_OFFENSE_TYPES = [
  "Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"
];

export default function DataAnalyticsView({ user }: { user: Partial<UserAccount> }) {
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/students").then(res => res.json()),
      fetch("/api/reports").then(res => res.json()),
      fetch("/api/critical-reports").then(res => res.json())
    ]).then(([allStudents, allReports, allCriticalReports]) => {
      let filteredStudents = allStudents;
      let filteredReports = allReports;
      let filteredCriticalReports = allCriticalReports;

      if (user.role === 'Admin' && user.gradeLevel && user.section) {
        filteredStudents = allStudents.filter((s: Student) => s.gradeLevel === user.gradeLevel && s.section === user.section);
        const lrnSet = new Set(filteredStudents.map((s: Student) => s.lrn));
        
        filteredReports = allReports.filter((r: Report) => lrnSet.has(r.studentLrn));
        filteredCriticalReports = allCriticalReports.filter((r: CriticalReport) => lrnSet.has(r.studentLrn));
      }

      setStudents(filteredStudents);
      setReports(filteredReports);
      setCriticalReports(filteredCriticalReports);
      setLoading(false);
    }).catch(console.error);
  }, [user]);

// ...

  const getStatsByGrade = (items: { studentLrn: string }[]) => {
    const stats: { [key: string]: { male: number; female: number; total: number } } = {};
    GRADE_LEVELS.forEach(g => stats[g] = { male: 0, female: 0, total: 0 });
    
    items.forEach(item => {
      const student = students.find(s => s.lrn === item.studentLrn);
      if (student) {
        const grade = student.gradeLevel;
        stats[grade].total++;
        if (student.gender === 'Male') stats[grade].male++;
        else stats[grade].female++;
      }
    });
    return stats;
  };

  const getStatsByIssue = (items: { issue: string; studentLrn: string }[], masterList: string[]) => {
    const stats: { [key: string]: { Male: number; Female: number } } = {};
    
    // Normalize master list to lowercase for matching
    const normalizedMaster = masterList.map(i => i.toLowerCase());
    
    masterList.forEach(issue => {
      stats[issue.toLowerCase()] = { Male: 0, Female: 0 };
    });

    items.forEach(item => {
      const student = students.find(s => s.lrn === item.studentLrn);
      const gender = student?.gender === 'Male' ? 'Male' : 'Female';
      const issueKey = item.issue?.toLowerCase();
      
      if (issueKey && stats[issueKey]) {
        stats[issueKey][gender]++;
      } else if (issueKey && issueKey.startsWith("others") && stats["others (please specify)"]) {
        stats["others (please specify)"][gender]++;
      }
    });

    return Object.entries(stats)
      .filter(([_, counts]) => counts.Male + counts.Female > 0)
      .map(([issue, genderCounts]) => ({
        issue: masterList.find(m => m.toLowerCase() === issue) || issue,
        ...genderCounts
    }));
  };
// ...

  const getTopStudents = (items: { studentLrn: string }[]) => {
    const counts: { [key: string]: number } = {};
    items.forEach(item => {
      counts[item.studentLrn] = (counts[item.studentLrn] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([lrn, count]) => {
        const s = students.find(student => student.lrn === lrn);
        return {
          name: s ? `${s.firstName} ${s.lastName}` : `Student ${lrn}`,
          count
        };
      });
  };

  const studentReportsOnly = reports.filter(r => STUDENT_REPORT_ISSUES.includes(r.issue) || (!CICL_OFFENSE_TYPES.includes(r.issue) && !CRITICAL_INCIDENT_ISSUES.includes(r.issue)));
  const ciclReportsOnly = reports.filter(r => CICL_OFFENSE_TYPES.includes(r.issue));

  const reportStats = getStatsByGrade(studentReportsOnly);
  const criticalStats = getStatsByGrade(criticalReports);
  const ciclStats = getStatsByGrade(ciclReportsOnly); 

  const categories = [
    { title: "General Student Reports", data: studentReportsOnly, stats: reportStats, issueStats: getStatsByIssue(studentReportsOnly, STUDENT_REPORT_ISSUES), icon: FileText, color: "text-blue-500", topStudents: getTopStudents(studentReportsOnly) },
    { title: "Critical Incident Reports", data: criticalReports, stats: criticalStats, issueStats: getStatsByIssue(criticalReports, CRITICAL_INCIDENT_ISSUES), icon: AlertTriangle, color: "text-red-500", topStudents: getTopStudents(criticalReports) },
    { title: "CICL Offense Reports", data: ciclReportsOnly, stats: ciclStats, issueStats: getStatsByIssue(ciclReportsOnly, CICL_OFFENSE_TYPES), icon: Clipboard, color: "text-orange-500", topStudents: getTopStudents(ciclReportsOnly) },
  ];

  const getTopActions = (items: (Report | CriticalReport)[]) => {
    const stats: { [key: string]: { Male: number; Female: number } } = {};
    items.forEach(item => {
      const student = students.find(s => s.lrn === item.studentLrn);
      const gender = student?.gender === 'Male' ? 'Male' : 'Female';
      const action = item.recommendation?.trim();
      
      if (!action) return; 
      
      if (!stats[action]) stats[action] = { Male: 0, Female: 0 };
      stats[action][gender]++;
    });
    
    return Object.entries(stats)
      .map(([name, genderCounts]) => ({
        name,
        ...genderCounts,
        total: genderCounts.Male + genderCounts.Female
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  };

  const actionData = getTopActions([...reports, ...criticalReports]);
  const COLORS = ['#3b82f6', '#ef4444', '#f97316'];

  return (
    <div className="space-y-10 p-4">
        {/* Overview Header */}
        <div className="mb-8">
            <h1 className="text-2xl font-serif text-slate-900">Data Analytics Dashboard</h1>
            <p className="text-sm text-slate-500">Comprehensive report analysis and student tracking.</p>
        </div>

      {categories.map((cat, i) => {
        const barData = GRADE_LEVELS.map(g => ({
          grade: g,
          Male: cat.stats[g].male,
          Female: cat.stats[g].female
        }));
        
        const genderData = [
          { name: 'Male', value: Object.values(cat.stats).reduce((acc, curr) => acc + curr.male, 0) },
          { name: 'Female', value: Object.values(cat.stats).reduce((acc, curr) => acc + curr.female, 0) }
        ];

        return (
          <div key={i} className="bg-white border border-slate-200 p-6 shadow-sm rounded-sm">
            <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
              <cat.icon className={cat.color} size={28} />
              <h2 className="font-bold text-xl text-slate-800 uppercase tracking-widest">{cat.title}</h2>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="h-64 col-span-2">
                    <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase text-center">Reports per Grade Level</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={barData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="grade" tick={{fontSize: 10}} />
                            <YAxis tick={{fontSize: 10}} />
                            <Tooltip cursor={{fill: 'transparent'}} />
                            <Legend wrapperStyle={{fontSize: '10px'}} />
                            <Bar dataKey="Male" fill="#3b82f6" radius={[2, 2, 0, 0]} />
                            <Bar dataKey="Female" fill="#ec4899" radius={[2, 2, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
                <div className="h-64">
                    <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase text-center">Gender Distribution</h3>
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie data={genderData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                                {genderData.map((entry, index) => <Cell key={`cell-${index}`} fill={index === 0 ? '#3b82f6' : '#ec4899'} />)}
                            </Pie>
                            <Tooltip />
                            <Legend />
                        </PieChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="h-96 mb-8">
                <h3 className="text-xs font-bold text-slate-600 mb-2 uppercase text-center">Reports per Issue/Concern</h3>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={cat.issueStats} layout="vertical" margin={{ left: 20 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" tick={{fontSize: 10}} />
                        <YAxis dataKey="issue" type="category" width={180} tick={{fontSize: 9}} />
                        <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                        <Legend wrapperStyle={{fontSize: '10px'}} />
                        <Bar dataKey="Male" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                        <Bar dataKey="Female" fill="#ec4899" radius={[0, 2, 2, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                    <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Top 5 Reported Students</h3>
                    <div className="bg-slate-50 p-4 rounded border border-slate-100">
                        {cat.topStudents.map((s, idx) => (
                            <div key={idx} className="flex justify-between py-2 border-b last:border-0 border-slate-200 text-sm text-slate-700">
                                <span className="font-medium">{idx + 1}. {s.name}</span>
                                <span className="font-bold text-slate-900">{s.count} reports</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div>
                    <h3 className="text-xs font-bold text-slate-600 mb-3 uppercase tracking-wide">Recent {cat.title} Raw Data</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr className="border-b border-slate-300">
                                    <th className="py-2">Date</th>
                                    <th className="py-2">Issue</th>
                                    <th className="py-2">Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {cat.data.slice(0, 5).map((d, idx) => (
                                    <tr key={idx} className="border-b border-slate-100">
                                        <td className="py-2">{d.dateReported}</td>
                                        <td className="py-2">{d.issue}</td>
                                        <td className="py-2">{d.actionTaken}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
          </div>
        );
      })}

      <div className="bg-white border border-slate-200 p-6 shadow-sm rounded-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="text-purple-600" size={20} />
            <h3 className="font-bold text-sm text-slate-800 uppercase tracking-widest">Top Recommended Actions Across All Reports</h3>
          </div>
          <span className="text-[10px] font-bold text-slate-400 border border-slate-200 px-2 py-0.5 rounded">MASTER LIST</span>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 h-96 w-full">
                <ResponsiveContainer>
                    <BarChart data={actionData} layout="vertical" margin={{ left: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" tick={{fontSize: 10}} />
                    <YAxis dataKey="name" type="category" width={180} tick={{fontSize: 9}} />
                    <Tooltip cursor={{fill: 'rgba(59, 130, 246, 0.05)'}} />
                    <Legend wrapperStyle={{fontSize: '10px'}} />
                    <Bar dataKey="Male" fill="#3b82f6" radius={[0, 2, 2, 0]} />
                    <Bar dataKey="Female" fill="#ec4899" radius={[0, 2, 2, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
            
            <div className="bg-slate-50 p-4 border border-slate-100 rounded">
                <h4 className="text-[10px] font-bold text-slate-500 uppercase mb-4 tracking-widest border-b border-slate-200 pb-2">Action Breakdown</h4>
                <div className="space-y-4">
                    {actionData.map((action, idx) => (
                        <div key={idx} className="flex flex-col gap-1 border-b border-slate-100 last:border-0 pb-2">
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">{action.name}</span>
                                <span className="text-xs font-black text-slate-900">{action.total}</span>
                            </div>
                            <div className="flex gap-4">
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                                    <span className="text-[9px] text-slate-500">Male: {action.Male}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                                    <span className="text-[9px] text-slate-500">Female: {action.Female}</span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      </div>
    </div>
  );
}
