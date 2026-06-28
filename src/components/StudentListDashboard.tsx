import React, { useState, useEffect } from "react";
import { Student, Report, CriticalReport } from "../types";
import StudentReportsViewModal from "./StudentReportsViewModal";

interface StudentListDashboardProps {
  user: any;
}

export default function StudentListDashboard({ user }: StudentListDashboardProps) {
  const [students, setStudents] = useState<Student[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/api/students").then(res => res.json()),
      fetch("/api/reports").then(res => res.json()),
      fetch("/api/critical-reports").then(res => res.json())
    ]).then(([allStudents, allReports, allCritReports]) => {
      const filtered = allStudents.filter((s: Student) => s.gradeLevel === user.gradeLevel && s.section === user.section);
      setStudents(filtered.sort((a: Student, b: Student) => a.lastName.localeCompare(b.lastName)));
      setReports(allReports);
      setCriticalReports(allCritReports);
      setLoading(false);
    });
  }, [user.gradeLevel, user.section]);

  const getReportCounts = (lrn: string) => ({
    general: reports.filter(r => r.studentLrn === lrn).length,
    critical: criticalReports.filter(r => r.studentLrn === lrn).length,
    cicl: reports.filter(r => r.studentLrn === lrn && ["Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"].includes(r.issue)).length
  });

  if (loading) return <p className="text-sm p-8 text-slate-500">Loading student data...</p>;

  return (
    <div className="space-y-8">
      <h3 className="text-lg font-bold text-[#102604]">Students in {user.gradeLevel} - {user.section}</h3>
      
      <div className="grid md:grid-cols-2 gap-8">
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
                      <span className="text-[10px] font-bold bg-green-100 text-green-800 px-2 py-1 rounded">{counts.general}</span>
                      <span className="text-[10px] font-bold bg-red-100 text-red-800 px-2 py-1 rounded">{counts.critical}</span>
                      <span className="text-[10px] font-bold bg-orange-100 text-orange-800 px-2 py-1 rounded">{counts.cicl}</span>
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
    </div>
  );
}
