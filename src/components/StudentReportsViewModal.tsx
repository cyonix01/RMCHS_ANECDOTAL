import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, FileText, AlertTriangle, ShieldAlert, User, Camera, Loader2 } from "lucide-react";
import { Student, Report, CriticalReport } from "../types";
import { getDriveImageUrl } from "../utils/driveUtils";

function parseRobustDateTime(val: any): Date | null {
  if (val === null || val === undefined) return null;
  
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  if (typeof val === "number") {
    const adjusted = val < 10000000000 ? val * 1000 : val;
    const d = new Date(adjusted);
    return isNaN(d.getTime()) ? null : d;
  }
  
  if (typeof val === "string") {
    let trimmed = val.trim();
    if (!trimmed) return null;
    
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const adjusted = num < 10000000000 ? num * 1000 : num;
      const d = new Date(adjusted);
      if (!isNaN(d.getTime())) return d;
    }
    
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
      trimmed = trimmed.replace(/\s+/, 'T');
    }
    
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
    
    d = new Date(trimmed.replace(/\//g, '-'));
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

function getReportSortValue(report: any): number {
  if (!report) return 0;
  
  const dateReportedVal = report.dateReported;
  const parsedReported = parseRobustDateTime(dateReportedVal);
  if (parsedReported) {
    return parsedReported.getTime();
  }
  
  const dateOfIncidentVal = report.dateOfIncident;
  const timeOfIncidentVal = report.timeOfIncident;
  
  if (dateOfIncidentVal) {
    const datePart = String(dateOfIncidentVal).trim();
    const timePart = String(timeOfIncidentVal || "00:00").trim();
    const parsedIncident = parseRobustDateTime(`${datePart}T${timePart}`);
    if (parsedIncident) {
      return parsedIncident.getTime();
    }
    const parsedJustDate = parseRobustDateTime(datePart);
    if (parsedJustDate) {
      return parsedJustDate.getTime();
    }
  }
  
  return 0;
}

interface StudentReportsViewModalProps {
  student: Student;
  onClose: () => void;
  userRole?: string;
  onPhotoUpdated?: (updatedLrn: string, newUrl: string) => void;
}

export default function StudentReportsViewModal({ student, onClose, userRole, onPhotoUpdated }: StudentReportsViewModalProps) {
  const [reports, setReports] = useState<(Report & {type: 'General' | 'Critical'})[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(student.profilePictureUrl || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert("File is too large. Max size is 5MB.");
      return;
    }

    setIsUploadingPhoto(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const base64 = (event.target?.result as string).split(',')[1];
        const res = await fetch(`/api/students/${student.lrn}/photo`, {
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
        setCurrentPhotoUrl(newUrl);
        if (onPhotoUpdated) {
          onPhotoUpdated(student.lrn, newUrl);
        }
        alert(`Profile picture updated for ${student.firstName} ${student.lastName}!`);
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      console.error("Photo upload failed:", err);
      alert(`Photo upload error: ${err.message}`);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const fetchReports = React.useCallback(() => {
    Promise.all([
      fetch("/api/reports").then(res => { if (!res.ok) throw new Error("reports"); return res.json(); }),
      fetch("/api/critical-reports").then(res => { if (!res.ok) throw new Error("critical-reports"); return res.json(); })
    ]).then(([genReports, critReports]) => {
      if (genReports.error || critReports.error) throw new Error("API error");
      const studentReports = [
        ...genReports.filter((r: Report) => r.studentLrn === student.lrn).map((r: any) => ({ ...r, type: 'General' })),
        ...critReports.filter((r: CriticalReport) => r.studentLrn === student.lrn).map((r: any) => ({ ...r, type: 'Critical' }))
      ].sort((a, b) => {
        // Sort: On Going at top, then by date descending
        if (a.recordStatus === 'On Going' && b.recordStatus !== 'On Going') return -1;
        if (a.recordStatus !== 'On Going' && b.recordStatus === 'On Going') return 1;
        
        // If statuses are the same (both On Going or both RESOLVED), sort by date
        const valA = getReportSortValue(a);
        const valB = getReportSortValue(b);
        if (valA !== valB) return valB - valA;
        return String(b.id || "").localeCompare(String(a.id || ""));
      });
      
      setReports(studentReports);
      setLoading(false);
    }).catch(err => {
      console.error(err);
      setLoading(false);
    });
  }, [student.lrn]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handlePhotoUpload} 
        accept="image/*" 
        className="hidden" 
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
      >
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-3">
            <div className="relative group/modalAvatar shrink-0">
              {currentPhotoUrl ? (
                <img 
                  src={getDriveImageUrl(currentPhotoUrl)} 
                  alt={student.lastName}
                  className="w-8 h-8 rounded-full object-cover border border-slate-200"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0 border border-slate-300">
                  <User size={14} className="text-slate-500" />
                </div>
              )}
              <button
                type="button"
                title="Change student profile picture"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploadingPhoto}
                className="absolute -bottom-1 -right-1 bg-[#102604] hover:bg-[#76DA0D] hover:text-[#102604] text-white p-1 rounded-full shadow transition-all hover:scale-110 shrink-0"
              >
                {isUploadingPhoto ? (
                  <Loader2 size={10} className="animate-spin" />
                ) : (
                  <Camera size={10} />
                )}
              </button>
            </div>
            <span>Reports for {student.lastName}, {student.firstName} ({student.gradeLevel} - {student.section})</span>
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
