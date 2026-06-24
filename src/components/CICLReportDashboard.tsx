import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Table, FileText, CheckCircle2, AlertTriangle, Search } from "lucide-react";
import { Report } from "../types";

export default function CICLReportDashboard() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"ALL" | "ON GOING" | "RESOLVED">("ALL");

  useEffect(() => {
    fetch("/api/reports?type=CICL")
      .then(res => res.json())
      .then(data => {
        setReports(data);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  const filteredReports = reports.filter(r => filter === "ALL" || r.recordStatus === filter);

  return (
    <div className="bg-white border border-slate-200 shadow-xs p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="font-bold text-lg text-slate-800 uppercase tracking-widest flex items-center gap-2">
          <FileText size={20} className="text-red-500" />
          CICL Cases Dashboard
        </h2>
        <select 
          value={filter} 
          onChange={(e) => setFilter(e.target.value as any)}
          className="border border-slate-300 text-xs px-3 py-2"
        >
          <option value="ALL">All Status</option>
          <option value="ON GOING">Pending (On Going)</option>
          <option value="RESOLVED">Resolved</option>
        </select>
      </div>

      {loading ? (
        <p className="text-sm text-slate-500">Loading reports...</p>
      ) : (
        <table className="w-full text-left text-xs border-collapse">
          <thead className="bg-slate-50">
            <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
              <th className="px-4 py-3">Student LRN</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filteredReports.map((r, i) => (
              <tr key={i} className="hover:bg-slate-50">
                <td className="px-4 py-3">{r.studentLrn}</td>
                <td className="px-4 py-3">{r.dateOfIncident}</td>
                <td className="px-4 py-3">{r.issue}</td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded ${r.recordStatus === 'RESOLVED' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                    {r.recordStatus}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
