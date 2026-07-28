import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { 
  X, FileText, AlertTriangle, User, Camera, Loader2, 
  Printer, Download, Phone, MapPin, Calendar, BookOpen, CheckCircle, Clock 
} from "lucide-react";
import { Student, Report, CriticalReport } from "../types";
import { getDriveImageUrl } from "../utils/driveUtils";
import { generateStudentProfilePDF } from "../utils/pdfGenerator";

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
  const [generalReports, setGeneralReports] = useState<Report[]>([]);
  const [criticalReports, setCriticalReports] = useState<CriticalReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPhotoUrl, setCurrentPhotoUrl] = useState(student.profilePictureUrl || "");
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const currentUser = React.useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("teacher_portal_user") || "{}");
    } catch {
      return {};
    }
  }, []);

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
        const userEmail = currentUser?.email || "";
        const res = await fetch(`/api/students/${student.lrn}/photo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'x-user-email': userEmail
          },
          body: JSON.stringify({
            updatedBy: userEmail,
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
    if (!isMountedRef.current) return;
    Promise.all([
      fetch("/api/reports").then(res => { if (!res.ok) throw new Error("reports"); return res.json(); }),
      fetch("/api/critical-reports").then(res => { if (!res.ok) throw new Error("critical-reports"); return res.json(); })
    ]).then(([genReports, critReports]) => {
      if (!isMountedRef.current) return;
      if (genReports.error || critReports.error) throw new Error("API error");
      
      const filteredGen = genReports
        .filter((r: Report) => r.studentLrn === student.lrn)
        .sort((a: any, b: any) => getReportSortValue(b) - getReportSortValue(a));

      const filteredCrit = critReports
        .filter((r: CriticalReport) => r.studentLrn === student.lrn)
        .sort((a: any, b: any) => getReportSortValue(b) - getReportSortValue(a));

      if (isMountedRef.current) {
        setGeneralReports(filteredGen);
        setCriticalReports(filteredCrit);
        setLoading(false);
      }
    }).catch(err => {
      console.error(err);
      if (isMountedRef.current) {
        setLoading(false);
      }
    });
  }, [student.lrn]);

  useEffect(() => {
    setLoading(true);
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, [fetchReports]);

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = async () => {
    setExportingPdf(true);
    try {
      await generateStudentProfilePDF(student, generalReports, criticalReports, currentUser);
    } catch (err) {
      console.error("Failed to generate PDF:", err);
      alert("An error occurred while exporting the PDF.");
    } finally {
      setExportingPdf(false);
    }
  };

  const totalGenCount = generalReports.length;
  const totalCritCount = criticalReports.length;
  const activeCasesCount = [...generalReports, ...criticalReports].filter(r => r.recordStatus === 'On Going').length;
  const resolvedCasesCount = [...generalReports, ...criticalReports].filter(r => r.recordStatus === 'RESOLVED').length;

  const addressString = [
    student.houseNumber,
    student.street,
    student.barangay,
    student.city
  ].filter(Boolean).join(", ") || "No address provided";

  const guardianContactName = student.guardianName || student.fatherName || student.motherName || "N/A";
  const guardianPhone = student.guardianContact || student.fatherContact || student.motherContact || "N/A";

  return (
    <>
      {/* Screen Modal */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans print:hidden">
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
          className="bg-white border border-slate-200 shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden rounded-xl"
        >
          {/* Header Bar */}
          <div className="p-4 border-b border-slate-200 flex flex-wrap justify-between items-center bg-[#102604] text-white gap-3">
            <div className="flex items-center gap-3">
              <div className="relative group/modalAvatar shrink-0">
                {currentPhotoUrl ? (
                  <img 
                    src={getDriveImageUrl(currentPhotoUrl)} 
                    alt={student.lastName}
                    className="w-10 h-10 rounded-full object-cover border-2 border-[#76DA0D]"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center shrink-0 border border-white/20">
                    <User size={18} className="text-white/70" />
                  </div>
                )}
                <button
                  type="button"
                  title="Change student profile picture"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingPhoto}
                  className="absolute -bottom-1 -right-1 bg-[#76DA0D] text-[#102604] p-1 rounded-full shadow transition-all hover:scale-110 shrink-0"
                >
                  {isUploadingPhoto ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Camera size={10} />
                  )}
                </button>
              </div>
              <div>
                <h2 className="font-bold text-base text-white uppercase tracking-wide flex items-center gap-2">
                  <span>{student.lastName}, {student.firstName} {student.middleName || ""}</span>
                </h2>
                <div className="flex items-center gap-2 text-xs text-slate-300">
                  <span className="font-mono text-[#76DA0D] font-bold">LRN: {student.lrn}</span>
                  <span>•</span>
                  <span>{student.gradeLevel} - {student.section}</span>
                </div>
              </div>
            </div>

            {/* Print & Action Buttons */}
            <div className="flex items-center gap-2">
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 bg-[#76DA0D] hover:bg-[#68C20B] text-[#102604] font-bold px-3.5 py-1.5 rounded text-xs transition-colors shadow-sm cursor-pointer"
                title="Print student profile and records"
              >
                <Printer size={15} />
                <span>Print Profile</span>
              </button>

              <button
                onClick={handleExportPDF}
                disabled={exportingPdf}
                className="flex items-center gap-2 bg-white/10 hover:bg-white/20 text-white font-bold px-3.5 py-1.5 rounded text-xs transition-colors border border-white/20 cursor-pointer disabled:opacity-50"
                title="Export PDF document"
              >
                {exportingPdf ? (
                  <Loader2 size={15} className="animate-spin text-[#76DA0D]" />
                ) : (
                  <Download size={15} className="text-[#76DA0D]" />
                )}
                <span>{exportingPdf ? "Exporting..." : "Export PDF"}</span>
              </button>

              <button 
                onClick={onClose} 
                className="text-white/70 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors ml-1"
                title="Close profile"
              >
                <X size={20} />
              </button>
            </div>
          </div>

          {/* Modal Body Scroll Area */}
          <div className="p-6 overflow-y-auto space-y-6 bg-slate-50/50">

            {/* Student Demographic Profile Overview */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#102604] flex items-center gap-2">
                  <User size={15} className="text-[#76DA0D]" />
                  <span>Student Demographic & Enrollment Overview</span>
                </h3>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700">
                    {student.gender || "N/A"}
                  </span>
                  <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-green-50 text-green-800 border border-green-200">
                    {student.learningModality || "Face-to-Face"}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Profile Col 1 */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Date of Birth</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Calendar size={13} className="text-slate-400" />
                      {student.dateOfBirth || "Not specified"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Religion</span>
                    <span className="font-semibold text-slate-800">
                      {student.religion === 'Others' ? student.religionSpecify || 'Others' : student.religion || "Catholic"}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Assistance / Beneficiary</span>
                    <span className="font-semibold text-slate-800">
                      4Ps: <strong className={student.is4ps === 'Yes' ? 'text-green-700' : 'text-slate-600'}>{student.is4ps || 'No'}</strong> • Indigenous: <strong>{student.isIndigenous || 'No'}</strong>
                    </span>
                  </div>
                </div>

                {/* Profile Col 2 */}
                <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Parent / Guardian Contact</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <Phone size={13} className="text-slate-400" />
                      {guardianContactName} ({guardianPhone})
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-slate-400 block">Address</span>
                    <span className="font-semibold text-slate-800 flex items-center gap-1.5 mt-0.5">
                      <MapPin size={13} className="text-slate-400 shrink-0" />
                      <span className="truncate">{addressString}</span>
                    </span>
                  </div>
                </div>

                {/* Profile Col 3 - Stats */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-amber-50 border border-amber-200/60 p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-amber-800">Anecdotal Logs</span>
                    <span className="text-xl font-bold text-amber-900 mt-1">{totalGenCount}</span>
                    <span className="text-[9px] text-amber-700/80">General incidents</span>
                  </div>

                  <div className="bg-red-50 border border-red-200/60 p-3 rounded-lg flex flex-col justify-center">
                    <span className="text-[9px] uppercase font-bold text-red-800">Investigations</span>
                    <span className="text-xl font-bold text-red-900 mt-1">{totalCritCount}</span>
                    <span className="text-[9px] text-red-700/80">Critical cases</span>
                  </div>

                  <div className="bg-blue-50 border border-blue-200/60 p-3 rounded-lg flex flex-col justify-center col-span-2">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-[10px] font-bold text-blue-900 uppercase">Case Resolution</span>
                      <span className="text-[10px] text-blue-700">
                        {resolvedCasesCount} Resolved / {activeCasesCount} Active
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500">
                <Loader2 size={24} className="animate-spin mx-auto mb-2 text-[#76DA0D]" />
                <p className="text-xs">Loading records and investigation history...</p>
              </div>
            ) : (
              <>
                {/* SECTION I: ANECDOTAL RECORDS (GENERAL INCIDENTS) */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <FileText size={15} className="text-[#76DA0D]" />
                      <span>Anecdotal Records & General Incident Logs</span>
                      <span className="bg-slate-200 text-slate-700 font-mono text-[10px] px-2 py-0.5 rounded-full">
                        {generalReports.length}
                      </span>
                    </h3>
                  </div>

                  {generalReports.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs italic">
                      No general anecdotal incident logs recorded for this student.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {generalReports.map((report, idx) => (
                        <div key={`gen-${report.id}-${idx}`} className="bg-white border border-slate-200 rounded-lg p-4 shadow-xs space-y-2">
                          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">{report.issue}</span>
                                <span className="text-[10px] font-mono text-slate-400">#{report.id}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Clock size={11} className="text-slate-400" />
                                Date of Incident: {report.dateOfIncident || 'N/A'} {report.timeOfIncident ? `• ${report.timeOfIncident}` : ''}
                              </p>
                            </div>

                            <span className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                              report.recordStatus === 'RESOLVED' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-amber-50 text-amber-700 border-amber-200'
                            }`}>
                              {report.recordStatus || 'On Going'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <p><strong className="text-slate-900">Behavior / Incident Description:</strong> "{report.description}"</p>
                            {report.actionTaken && (
                              <p><strong className="text-slate-900">Action Taken by Adviser:</strong> {report.actionTaken}</p>
                            )}
                            {report.recommendation && (
                              <p className="text-green-900 bg-green-50/70 p-2 rounded border border-green-100 mt-1">
                                <strong>Guidance Recommendation:</strong> {report.recommendation}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                            <span>Reported By: {report.reportedBy || 'Staff'}</span>
                            <span>Date Reported: {report.dateReported || 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* SECTION II: INVESTIGATION HISTORY (CRITICAL INCIDENTS) */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-red-900 flex items-center gap-2">
                      <AlertTriangle size={15} className="text-red-600" />
                      <span>Case Investigation History & Critical Incident Reports</span>
                      <span className="bg-red-100 text-red-800 font-mono text-[10px] px-2 py-0.5 rounded-full">
                        {criticalReports.length}
                      </span>
                    </h3>
                  </div>

                  {criticalReports.length === 0 ? (
                    <div className="bg-white border border-slate-200 rounded-lg p-6 text-center text-slate-400 text-xs italic">
                      No critical incident investigations recorded for this student.
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {criticalReports.map((crit, idx) => (
                        <div key={`crit-${crit.id}-${idx}`} className="bg-white border border-red-200 rounded-lg p-4 shadow-xs space-y-2 border-l-4 border-l-red-600">
                          <div className="flex flex-wrap justify-between items-start gap-2 border-b border-slate-100 pb-2">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-red-900 text-sm">{crit.issue}</span>
                                <span className="text-[10px] font-mono bg-red-100 text-red-800 px-1.5 py-0.5 rounded">CR-{crit.id}</span>
                              </div>
                              <p className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                                <Clock size={11} className="text-slate-400" />
                                Date of Incident: {crit.dateOfIncident || 'N/A'} {crit.timeOfIncident ? `• ${crit.timeOfIncident}` : ''}
                              </p>
                            </div>

                            <span className={`text-[9px] uppercase font-bold px-2.5 py-0.5 rounded-full border ${
                              crit.recordStatus === 'RESOLVED' 
                                ? 'bg-green-50 text-green-700 border-green-200' 
                                : 'bg-red-50 text-red-700 border-red-200'
                            }`}>
                              {crit.recordStatus || 'On Going'}
                            </span>
                          </div>

                          <div className="text-xs text-slate-700 space-y-1">
                            <p><strong className="text-slate-900">Investigation Summary:</strong> "{crit.description}"</p>
                            {crit.actionTaken && (
                              <p><strong className="text-slate-900">Immediate Action Taken:</strong> {crit.actionTaken}</p>
                            )}
                            {crit.recommendation && (
                              <p className="text-red-900 bg-red-50/70 p-2 rounded border border-red-100 mt-1">
                                <strong>Guidance Counselor Intervention / Notes:</strong> {crit.recommendation}
                              </p>
                            )}
                          </div>

                          <div className="flex justify-between items-center text-[10px] text-slate-400 pt-1 border-t border-slate-50">
                            <span>Investigated / Filed By: {crit.reportedBy || 'Guidance Staff'}</span>
                            <span>Date Filed: {crit.dateReported || 'N/A'}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}

          </div>
        </motion.div>
      </div>

      {/* Printable Report Component (Visible ONLY during printing via window.print()) */}
      <div id="printable-student-profile-area" className="hidden print:block font-sans p-8 bg-white text-slate-900">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #printable-student-profile-area, #printable-student-profile-area * {
              visibility: visible;
            }
            #printable-student-profile-area {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white !important;
              color: black !important;
            }
            .print-border {
              border: 1px solid #cbd5e1 !important;
            }
            .print-header {
              border-bottom: 2px solid #0f172a !important;
            }
          }
        `}</style>

        {/* DepEd Header */}
        <div className="text-center print-header pb-4 mb-6">
          <div className="flex items-center justify-center gap-4 mb-2">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/2/20/Department_of_Education.svg/500px-Department_of_Education.svg.png" 
              alt="DepEd Logo" 
              className="w-12 h-12 object-contain"
            />
          </div>
          <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Republic of the Philippines • Department of Education</p>
          <p className="text-[10px] font-bold text-slate-600">National Capital Region • Schools Division Office, Quezon City</p>
          <h1 className="text-base font-black text-[#102604] uppercase tracking-wide mt-1">RAMON MAGSAYSAY (CUBAO) HIGH SCHOOL</h1>
          <p className="text-[9px] font-mono font-bold text-slate-500 mt-0.5">PROJECT C.A.R.E. (COUNSELING & ACADEMIC RECORDS ENGAGEMENT)</p>
          <div className="mt-3 pt-2 border-t border-slate-300">
            <h2 className="text-xs font-black uppercase tracking-widest text-[#102604]">INDIVIDUAL STUDENT ANECDOTAL & INVESTIGATION RECORD</h2>
            <p className="text-[9px] text-slate-500">Official Student Profile & Guidance Case History Log</p>
          </div>
        </div>

        {/* Student Profile Card */}
        <div className="print-border rounded p-4 mb-6 bg-slate-50/50">
          <h3 className="text-xs font-bold uppercase text-[#102604] border-b border-slate-200 pb-2 mb-3">
            I. Student Demographic Information
          </h3>

          <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs">
            <div>
              <p><strong className="text-slate-700">Full Name:</strong> {student.lastName}, {student.firstName} {student.middleName || ""}</p>
              <p><strong className="text-slate-700">Learner Reference Number (LRN):</strong> {student.lrn}</p>
              <p><strong className="text-slate-700">Grade Level & Section:</strong> {student.gradeLevel} - {student.section}</p>
              <p><strong className="text-slate-700">Gender / Date of Birth:</strong> {student.gender || 'N/A'} • {student.dateOfBirth || 'N/A'}</p>
            </div>

            <div>
              <p><strong className="text-slate-700">Parent / Guardian:</strong> {guardianContactName}</p>
              <p><strong className="text-slate-700">Contact Number:</strong> {guardianPhone}</p>
              <p><strong className="text-slate-700">Residential Address:</strong> {addressString}</p>
              <p><strong className="text-slate-700">Learning Modality / 4Ps:</strong> {student.learningModality || 'Face-to-Face'} • 4Ps: {student.is4ps || 'No'}</p>
            </div>
          </div>
        </div>

        {/* Anecdotal Records Section */}
        <div className="mb-6">
          <h3 className="text-xs font-bold uppercase text-[#102604] border-b-2 border-[#102604] pb-1 mb-3">
            II. Anecdotal Records & General Incident History ({generalReports.length})
          </h3>

          {generalReports.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 border border-slate-200 rounded">No general anecdotal incident logs recorded for this student.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs print-border">
              <thead>
                <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[10px] uppercase">
                  <th className="p-2 border-r border-slate-300">ID / Date</th>
                  <th className="p-2 border-r border-slate-300">Offense / Issue</th>
                  <th className="p-2 border-r border-slate-300">Description of Behavior</th>
                  <th className="p-2 border-r border-slate-300">Action Taken / Recommendation</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {generalReports.map((r, idx) => (
                  <tr key={`gen-tbl-${r.id}-${idx}`}>
                    <td className="p-2 border-r border-slate-200 font-mono text-[10px]">
                      #{r.id}<br/>
                      <span className="text-slate-500 font-sans">{r.dateOfIncident || r.dateReported || 'N/A'}</span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-slate-900">{r.issue}</td>
                    <td className="p-2 border-r border-slate-200 italic">{r.description}</td>
                    <td className="p-2 border-r border-slate-200">
                      {r.actionTaken && <div><strong>Action:</strong> {r.actionTaken}</div>}
                      {r.recommendation && <div className="text-green-800"><strong>Rec:</strong> {r.recommendation}</div>}
                    </td>
                    <td className="p-2 text-center font-bold text-[10px]">
                      {r.recordStatus || 'On Going'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Investigation History Section */}
        <div className="mb-8">
          <h3 className="text-xs font-bold uppercase text-red-900 border-b-2 border-red-800 pb-1 mb-3">
            III. Case Investigation History & Critical Reports ({criticalReports.length})
          </h3>

          {criticalReports.length === 0 ? (
            <p className="text-xs text-slate-500 italic p-3 border border-slate-200 rounded">No critical incident investigations recorded for this student.</p>
          ) : (
            <table className="w-full text-left border-collapse text-xs print-border">
              <thead>
                <tr className="bg-red-50 border-b border-red-200 font-bold text-[10px] uppercase text-red-900">
                  <th className="p-2 border-r border-red-200">Case ID / Date</th>
                  <th className="p-2 border-r border-red-200">Critical Offense</th>
                  <th className="p-2 border-r border-red-200">Investigation Details</th>
                  <th className="p-2 border-r border-red-200">Counseling & Guidance Notes</th>
                  <th className="p-2 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {criticalReports.map((r, idx) => (
                  <tr key={`crit-tbl-${r.id}-${idx}`}>
                    <td className="p-2 border-r border-slate-200 font-mono text-[10px]">
                      CR-{r.id}<br/>
                      <span className="text-slate-500 font-sans">{r.dateOfIncident || r.dateReported || 'N/A'}</span>
                    </td>
                    <td className="p-2 border-r border-slate-200 font-bold text-red-900">{r.issue}</td>
                    <td className="p-2 border-r border-slate-200 italic">{r.description}</td>
                    <td className="p-2 border-r border-slate-200">
                      {r.actionTaken && <div><strong>Action:</strong> {r.actionTaken}</div>}
                      {r.recommendation && <div className="text-red-900"><strong>Guidance:</strong> {r.recommendation}</div>}
                    </td>
                    <td className="p-2 text-center font-bold text-[10px]">
                      {r.recordStatus || 'On Going'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Verification & Signatures */}
        <div className="mt-12 pt-6 border-t border-slate-300 grid grid-cols-2 gap-12 text-xs">
          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-8">Prepared / Logged By:</p>
            <div className="border-b border-slate-800 w-48"></div>
            <p className="font-bold text-slate-900 mt-1">{currentUser.firstName ? `${currentUser.firstName} ${currentUser.lastName}` : 'Class Adviser / Guidance Staff'}</p>
            <p className="text-[10px] text-slate-500">{currentUser.role || 'Adviser / Guidance Counselor'}</p>
          </div>

          <div>
            <p className="text-[10px] text-slate-500 uppercase font-bold mb-8">Noted & Attested By:</p>
            <div className="border-b border-slate-800 w-48"></div>
            <p className="font-bold text-slate-900 mt-1">Guidance Counselor / School Principal</p>
            <p className="text-[10px] text-slate-500">Project C.A.R.E. Program Lead</p>
          </div>
        </div>

        <div className="mt-8 text-center text-[9px] text-slate-400 font-mono">
          System Generated Student Record • Ramon Magsaysay High School Project C.A.R.E. • Date Printed: {new Date().toLocaleString()}
        </div>
      </div>
    </>
  );
}
