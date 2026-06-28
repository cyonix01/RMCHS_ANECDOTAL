/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Calendar, FileText, Download, Filter, User, ChevronRight, AlertCircle, ShieldAlert, Clock } from "lucide-react";
import { Report, CriticalReport } from "../types";
import { useNotification } from "./NotificationProvider";

interface ReportsViewerModalProps {
  onClose: () => void;
  userEmail: string;
}

interface CombinedReport {
  id: string | number;
  studentName: string;
  studentLrn: string;
  issue: string;
  dateReported: string;
  reportedBy: string;
  details: string;
  actionTaken: string;
  recommendation: string;
  type: 'General' | 'Critical';
  lastUpdatedBy?: string;
}

const ReportsViewerModal: React.FC<ReportsViewerModalProps> = ({ onClose, userEmail }) => {
  const { notify } = useNotification();
  const [reports, setReports] = useState<CombinedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<'All' | 'General' | 'Critical'>('All');
  const [selectedReportForView, setSelectedReportForView] = useState<CombinedReport | null>(null);
  const [recommendationEdit, setRecommendationEdit] = useState("");
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);

  useEffect(() => {
    const fetchAllData = async () => {
    setLoading(true);
    try {
      const [genRes, critRes, studentRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/critical-reports"),
        fetch("/api/students")
      ]);

      if (genRes.ok && critRes.ok && studentRes.ok) {
        const genData: Report[] = await genRes.json();
        const critData: CriticalReport[] = await critRes.json();
        const students: any[] = await studentRes.json();

        const studentMap = new Map(students.map(s => [s.lrn, `${s.firstName} ${s.lastName}`]));

        const combined: CombinedReport[] = [
          ...genData.map(r => ({
            id: r.id || Math.random(),
            studentName: studentMap.get(r.studentLrn) || "Unknown Student",
            studentLrn: r.studentLrn,
            issue: r.issue,
            dateReported: r.dateReported,
            reportedBy: r.reportedBy,
            details: r.description || '',
            actionTaken: r.actionTaken || 'N/A',
            recommendation: r.recommendation || '',
            type: 'General' as const,
            lastUpdatedBy: r.lastUpdatedBy
          })),
          ...critData.map(r => ({
            id: r.id || Math.random(),
            studentName: studentMap.get(r.studentLrn) || "Unknown Student",
            studentLrn: r.studentLrn,
            issue: r.issue,
            dateReported: r.dateReported,
            reportedBy: r.reportedBy,
            details: r.description || '',
            actionTaken: r.actionTaken || 'N/A',
            recommendation: r.recommendation || '',
            type: 'Critical' as const,
            lastUpdatedBy: r.lastUpdatedBy
          }))
        ];

          // Sort by date descending
          combined.sort((a, b) => new Date(b.dateReported).getTime() - new Date(a.dateReported).getTime());
          setReports(combined);
        } else {
          notify("error", "Failed to retrieve institutional records.");
        }
      } catch (err) {
        notify("error", "Network error while accessing database.");
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();
  }, []);

  const handleUpdateRecommendation = async () => {
    if (!selectedReportForView) return;
    setIsUpdating(true);
    try {
      const endpoint = selectedReportForView.type === 'General' 
        ? `/api/reports/${selectedReportForView.id}/recommendation`
        : `/api/critical-reports/${selectedReportForView.id}/recommendation`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation: recommendationEdit,
          updatedBy: userEmail
        })
      });

      if (res.ok) {
        notify("success", "Recommendation updated and signed.");
        // Update local state
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { ...r, recommendation: recommendationEdit, lastUpdatedBy: userEmail }
            : r
        ));
        setSelectedReportForView(prev => prev ? { ...prev, recommendation: recommendationEdit, lastUpdatedBy: userEmail } : null);
      } else {
        notify("error", "Failed to commit update to registry.");
      }
    } catch (err) {
      notify("error", "Registry connection failed.");
    } finally {
      setIsUpdating(false);
    }
  };

  const filteredReports = useMemo(() => {
    return reports.filter(report => {
      const matchesSearch = 
        report.studentName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        report.studentLrn.includes(searchQuery);
      
      const reportDate = new Date(report.dateReported);
      const matchesStart = startDate ? reportDate >= new Date(startDate) : true;
      const matchesEnd = endDate ? reportDate <= new Date(endDate) : true;
      const matchesType = typeFilter === 'All' ? true : report.type === typeFilter;

      return matchesSearch && matchesStart && matchesEnd && matchesType;
    });
  }, [reports, searchQuery, startDate, endDate, typeFilter]);

  const handleExport = () => {
    if (filteredReports.length === 0) {
      notify("info", "No records available for export in current view.");
      return;
    }
    
    const csvContent = [
      ["Type", "Date", "Student Name", "LRN", "Issue/Incident", "Reported By", "Details"],
      ...filteredReports.map(r => [
        r.type,
        r.dateReported,
        r.studentName,
        r.studentLrn,
        r.issue,
        r.reportedBy,
        `"${r.details.replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reports_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("success", "Record archive exported successfully.");
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#102604]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[90vh]"
      >
        <div className="p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-[#76DA0D]/10 flex items-center justify-center rounded-full">
              <FileText size={24} className="text-[#102604]" />
            </div>
            <div>
              <h3 className="serif font-serif text-2xl text-slate-900 leading-tight">Institutional Record Archive</h3>
              <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400 mt-1">Registry of all student reports and critical incidents</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-[#102604] hover:bg-slate-50 transition-all rounded-full">
            <X size={24} />
          </button>
        </div>

        <div className="p-8 border-b border-slate-100 bg-slate-50/50 flex flex-wrap items-end gap-6 shrink-0">
          <div className="flex-1 min-w-[240px]">
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Student Identity / LRN</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D] transition-colors"
              />
            </div>
          </div>

          <div className="w-44">
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">Report Category</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-4 py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D] appearance-none"
            >
              <option value="All">All Categories</option>
              <option value="General">General Reports</option>
              <option value="Critical">Critical incidents</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <div className="w-40">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D]"
              />
            </div>
            <div className="w-40">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-2">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D]"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            className="px-6 py-2.5 bg-[#102604] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 h-[42px]"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-8 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-12 h-[1px] bg-[#76DA0D] animate-pulse" />
              <p className="serif italic text-slate-400 text-lg">Synchronizing Archive...</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <div className="border border-slate-100 overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100">
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Student Identity</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Issue / Incident</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Type</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Reported By</th>
                    <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredReports.map((report, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-5 whitespace-nowrap">
                        <p className="text-[11px] font-bold text-slate-900 tabular-nums">
                          {new Date(report.dateReported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-full shrink-0">
                            <User size={14} className="text-slate-400" />
                          </div>
                          <div>
                            <p className="text-[11px] font-bold text-[#102604] uppercase tracking-wider">{report.studentName}</p>
                            <p className="text-[9px] font-medium text-slate-400 tabular-nums">LRN: {report.studentLrn}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <button
                          onClick={() => {
                            setSelectedReportForView(report);
                            setRecommendationEdit(report.recommendation);
                            setShowDetail(true);
                          }}
                          className="text-[11px] font-bold text-left text-[#102604] hover:text-[#76DA0D] transition-colors leading-snug underline underline-offset-4 decoration-slate-200"
                        >
                          {report.issue}
                        </button>
                      </td>
                      <td className="px-6 py-5 text-center">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                          report.type === 'Critical' 
                            ? 'border-red-100 text-red-600 bg-red-50' 
                            : 'border-blue-100 text-blue-600 bg-blue-50'
                        }`}>
                          {report.type}
                        </span>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{report.reportedBy}</p>
                      </td>
                      <td className="px-6 py-5">
                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={() => {
                              setSelectedReportForView(report);
                              setRecommendationEdit(report.recommendation);
                              setShowDetail(true);
                            }}
                            className="p-1 text-slate-400 hover:text-[#102604]"
                          >
                            <ChevronRight size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <AlertCircle size={32} className="text-slate-200 mb-4" />
              <p className="serif italic text-slate-400 text-lg">No matching records found</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">Adjust your filters to broaden your search</p>
            </div>
          )}
        </div>

        <div className="p-8 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
            Archive synchronized in real-time with server registry
          </p>
          <button
            onClick={onClose}
            className="px-8 py-3 text-[10px] font-black uppercase tracking-[0.3em] text-[#102604] border border-[#102604] hover:bg-[#102604] hover:text-white transition-all"
          >
            Close Archive
          </button>
        </div>

        {/* Report Detail Overlay */}
        <AnimatePresence>
          {showDetail && selectedReportForView && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 bg-[#102604]/40 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] border border-slate-200"
              >
                <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div>
                    <h4 className="serif font-serif text-xl text-slate-900">Case Investigation Trace</h4>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Registry ID: {selectedReportForView.id}</p>
                  </div>
                  <button onClick={() => setShowDetail(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                  <div className="grid grid-cols-2 gap-8">
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject Student</label>
                      <p className="text-sm font-bold text-[#102604] uppercase tracking-wide">{selectedReportForView.studentName}</p>
                      <p className="text-[10px] font-medium text-slate-500 tabular-nums">LRN: {selectedReportForView.studentLrn}</p>
                    </div>
                    <div>
                      <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Primary Incident</label>
                      <p className="text-sm font-bold text-slate-800 leading-tight">{selectedReportForView.issue}</p>
                      <span className={`inline-block mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                        selectedReportForView.type === 'Critical' ? 'border-red-100 text-red-600 bg-red-50' : 'border-blue-100 text-blue-600 bg-blue-50'
                      }`}>
                        {selectedReportForView.type} Incident
                      </span>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        <FileText size={12} />
                        Case Description
                      </label>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600 leading-relaxed italic">
                        {selectedReportForView.details || "No description provided."}
                      </div>
                    </section>

                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        <ShieldAlert size={12} />
                        Immediate Action Taken
                      </label>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600 leading-relaxed font-medium">
                        {selectedReportForView.actionTaken}
                      </div>
                    </section>

                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#102604] mb-3">
                        <Filter size={12} className="text-[#76DA0D]" />
                        Guidance Recommendations
                        <span className="ml-auto text-[8px] font-bold text-[#76DA0D] animate-pulse">Editable Field</span>
                      </label>
                      <textarea
                        value={recommendationEdit}
                        onChange={(e) => setRecommendationEdit(e.target.value)}
                        placeholder="Provide guidance or follow-up recommendations..."
                        className="w-full p-4 bg-white border-2 border-slate-100 text-[11px] text-slate-800 leading-relaxed focus:outline-none focus:border-[#76DA0D] min-h-[120px] transition-colors"
                      />
                      {selectedReportForView.lastUpdatedBy && (
                        <p className="mt-2 text-[9px] font-bold italic text-slate-400 flex items-center gap-1">
                          <Clock size={10} />
                          Last revision signed by: {selectedReportForView.lastUpdatedBy}
                        </p>
                      )}
                    </section>
                  </div>
                </div>

                <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center rounded-full shrink-0">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reporting Officer</p>
                      <p className="text-[10px] font-bold text-slate-700">{selectedReportForView.reportedBy}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setShowDetail(false)}
                      className="px-6 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      Discard Changes
                    </button>
                    <button
                      onClick={handleUpdateRecommendation}
                      disabled={isUpdating}
                      className="px-8 py-2.5 bg-[#102604] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 min-w-[140px] justify-center"
                    >
                      {isUpdating ? (
                        <>
                          <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                          Signing...
                        </>
                      ) : (
                        "Update Archive"
                      )}
                    </button>
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ReportsViewerModal;
