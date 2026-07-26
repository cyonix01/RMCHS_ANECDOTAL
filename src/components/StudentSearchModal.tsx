import React, { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search, X, FileText, AlertTriangle, User, Camera, Loader2 } from "lucide-react";
import { Student } from "../types";
import StudentReportModal from "./StudentReportModal";
import CriticalReportModal from "./CriticalReportModal";
import { getDriveImageUrl } from "../utils/driveUtils";

interface StudentSearchModalProps {
  userName: string;
  onClose: () => void;
  onReportFiled?: () => void;
}

export default function StudentSearchModal({ userName, onClose, onReportFiled }: StudentSearchModalProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [selectedCriticalStudent, setSelectedCriticalStudent] = useState<Student | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadingLrn, setUploadingLrn] = useState<string | null>(null);
  const [activeStudentForPhoto, setActiveStudentForPhoto] = useState<Student | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerPhotoUpload = (student: Student) => {
    setActiveStudentForPhoto(student);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeStudentForPhoto) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max size is 5MB.");
      return;
    }

    setUploadingLrn(activeStudentForPhoto.lrn);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const res = await fetch(`/api/students/${activeStudentForPhoto.lrn}/photo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            file: {
              base64,
              name: file.name,
              mimeType: file.type
            }
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Failed to update picture");
        }

        const data = await res.json();
        const newUrl = data.url;

        setResults(prev => prev.map(s => s.lrn === activeStudentForPhoto.lrn ? { ...s, profilePictureUrl: newUrl } : s));
        alert(`Profile picture updated for ${activeStudentForPhoto.firstName} ${activeStudentForPhoto.lastName}!`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Upload error:", err);
      alert(`Photo upload error: ${err.message}`);
    } finally {
      setUploadingLrn(null);
      setActiveStudentForPhoto(null);
    }
  };

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
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-white border border-slate-200 shadow-xl w-full max-w-3xl max-h-[80vh] flex flex-col"
        >
          <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
            <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
              <Search size={16} className="text-[#76DA0D]" />
              Search Student for Report
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
              className="flex-1 px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
              placeholder="Search by LRN, Name, or Section..."
            />
            <button 
              onClick={handleSearch}
              className="px-4 py-2 bg-[#76DA0D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#88F015]"
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
                      <td className="px-4 py-3 font-medium text-slate-800">
                        <div className="flex items-center gap-2">
                          <div className="relative group/searchAvatar shrink-0">
                            {s.profilePictureUrl ? (
                              <img 
                                src={getDriveImageUrl(s.profilePictureUrl)} 
                                alt={s.lastName}
                                className="w-7 h-7 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity border border-slate-200 shrink-0"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(getDriveImageUrl(s.profilePictureUrl));
                                }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-7 h-7 bg-slate-100 flex items-center justify-center rounded-full shrink-0 border border-slate-200">
                                <User size={12} className="text-slate-400" />
                              </div>
                            )}
                            <button
                              type="button"
                              title={`Change photo for ${s.firstName} ${s.lastName}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                triggerPhotoUpload(s);
                              }}
                              disabled={uploadingLrn === s.lrn}
                              className="absolute -bottom-1 -right-1 bg-[#102604] hover:bg-[#76DA0D] hover:text-[#102604] text-white p-0.5 rounded-full shadow transition-all hover:scale-110 z-10"
                            >
                              {uploadingLrn === s.lrn ? (
                                <Loader2 size={8} className="animate-spin" />
                              ) : (
                                <Camera size={8} />
                              )}
                            </button>
                          </div>
                          <span>{s.lastName}, {s.firstName} {s.middleName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{s.gradeLevel}</td>
                      <td className="px-4 py-3">{s.section}</td>
                      <td className="px-4 py-3 text-right flex justify-end gap-2">
                        <button 
                          onClick={() => setSelectedStudent(s)}
                          className="flex items-center gap-1.5 bg-white border border-slate-200 px-3 py-1.5 hover:bg-slate-50 hover:border-[#76DA0D] transition-colors rounded-sm"
                        >
                          <FileText size={12} className="text-slate-600" />
                          Report
                        </button>
                        <button 
                          onClick={() => setSelectedCriticalStudent(s)}
                          className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 px-3 py-1.5 text-amber-800 hover:bg-amber-100 transition-colors rounded-sm"
                        >
                          <AlertTriangle size={12} className="text-amber-600" />
                          Critical
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
          <StudentReportModal 
            student={selectedStudent} 
            userName={userName}
            onClose={() => setSelectedStudent(null)} 
            onSuccess={onReportFiled}
          />
        )}
        {selectedCriticalStudent && (
          <CriticalReportModal 
            student={selectedCriticalStudent}
            userName={userName}
            onClose={() => setSelectedCriticalStudent(null)} 
            onSuccess={onReportFiled}
          />
        )}
        
        {previewImage && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setPreviewImage(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative max-w-3xl max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute -top-12 right-0 p-2 text-white hover:text-slate-200 transition-colors"
              >
                <X size={24} />
              </button>
              <img
                src={previewImage}
                alt="Student Profile"
                className="w-full h-auto max-h-[80vh] object-contain rounded shadow-2xl"
                referrerPolicy="no-referrer"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
