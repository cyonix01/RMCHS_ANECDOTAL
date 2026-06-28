import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, FileText } from "lucide-react";
import { Student } from "../types";
import CICLReportFormModal from "./CICLReportFormModal";

interface CICLSearchModalProps {
  userName: string;
  onClose: () => void;
  onReportFiled?: () => void;
}

export default function CICLSearchModal({ userName, onClose, onReportFiled }: CICLSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/students/search?query=${encodeURIComponent(query)}`);
      if (!response.ok) throw new Error("Search failed");
      const data = await response.json();
      setResults(data);
    } catch (err) {
      console.error("Search error:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200 shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        >
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Search size={16} className="text-red-500" />
              Search Student for CICL Report
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          
          <div className="p-4 border-b border-slate-200 flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSearch()}
              className="flex-1 px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-red-500"
              placeholder="Search by LRN or Last Name..."
            />
            <button 
              onClick={handleSearch}
              className="px-4 py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600"
            >
              Search
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <p className="text-xs text-center text-slate-500">Searching...</p>
            ) : (
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-50">
                  <tr className="border-b border-slate-200 text-slate-600 uppercase tracking-wider font-bold">
                    <th className="px-4 py-3">LRN</th>
                    <th className="px-4 py-3">Name</th>
                    <th className="px-4 py-3">Grade</th>
                    <th className="px-4 py-3">Section</th>
                    <th className="px-4 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {results.map((s) => (
                    <tr key={s.lrn} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3 font-mono text-slate-600">{s.lrn}</td>
                      <td className="px-4 py-3 font-medium text-slate-800">{s.lastName}, {s.firstName} {s.middleName}</td>
                      <td className="px-4 py-3">{s.gradeLevel}</td>
                      <td className="px-4 py-3">{s.section}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedStudent(s)}
                          className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 hover:bg-slate-50 hover:border-red-500 transition-colors rounded-sm text-red-700"
                        >
                          <FileText size={12} />
                          Report CICL
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {selectedStudent && (
          <CICLReportFormModal 
            student={selectedStudent} 
            userName={userName}
            onClose={() => setSelectedStudent(null)} 
            onSuccess={onReportFiled}
          />
        )}
      </AnimatePresence>
    </>
  );
}
