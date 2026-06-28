import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, FileText, AlertTriangle, ShieldAlert } from "lucide-react";
import { Student, Report, CriticalReport } from "../types";

interface StudentReportsViewModalProps {
  student: Student;
  onClose: () => void;
}

export default function StudentReportsViewModal({ student, onClose }: StudentReportsViewModalProps) {
  const [reports, setReports] = useState<(Report & {type: 'General' | 'Critical'})[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/reports").then(res => res.json()),
      fetch("/api/critical-reports").then(res => res.json())
    ]).then(([genReports, critReports]) => {
      const studentReports = [
        ...genReports.filter((r: Report) => r.studentLrn === student.lrn).map((r: any) => ({ ...r, type: 'General' })),
        ...critReports.filter((r: CriticalReport) => r.studentLrn === student.lrn).map((r: any) => ({ ...r, type: 'Critical' }))
      ].sort((a, b) => {
        // Sort: On Going at top, then by date descending
        if (a.recordStatus === 'On Going' && b.recordStatus !== 'On Going') return -1;
        if (a.recordStatus !== 'On Going' && b.recordStatus === 'On Going') return 1;
        
        // If statuses are the same (both On Going or both RESOLVED), sort by date
        return new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime();
      });
      
      setReports(studentReports);
      setLoading(false);
    });
  }, [student.lrn]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} className="text-[#76DA0D]" />
            Reports for {student.lastName}, {student.firstName}
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {loading ? (
            <p className="text-center text-slate-500">Loading reports...</p>
          ) : reports.length === 0 ? (
            <p className="text-center text-slate-500">No reports found for this student.</p>
          ) : (
            <div className="space-y-4">
              {reports.map((report, idx) => (
                <div key={idx} className="border border-slate-200 p-4 rounded-sm flex gap-4">
                  <div className={`w-1 shrink-0 ${report.type === 'General' ? 'bg-[#76DA0D]' : 'bg-red-500'}`} />
                  <div className="flex-1 space-y-1">
                    <div className="flex justify-between">
                      <h4 className="font-bold text-slate-900">{report.issue}</h4>
                      <div className="flex gap-2 items-center">
                        <span className={`text-[9px] uppercase font-bold px-2 py-0.5 rounded ${report.recordStatus === 'On Going' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-700'}`}>
                          {report.recordStatus}
                        </span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 ${report.type === 'General' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {report.type}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 italic">"{report.description}"</p>
                    <p className="text-[10px] text-slate-400">Date Reported: {report.dateReported}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
