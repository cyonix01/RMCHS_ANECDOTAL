import React, { useState } from "react";
import { motion } from "motion/react";
import { X, AlertTriangle } from "lucide-react";
import { Student, CriticalReport } from "../types";
import { useNotification } from "./NotificationProvider";
import { getDriveImageUrl } from "../utils/driveUtils";

interface CriticalReportModalProps {
  student: Student;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const ISSUE_OPTIONS = [
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

const ACTION_OPTIONS = [
  "Isolated the student from peers to ensure safety", "Conducted initial counseling or psychological first aid", 
  "Reported the case immediately to the school guidance counselor or admin", 
  "Documented the incident in the anecdotal record (flagged as Critical Issue)", 
  "Called the parent/guardian for urgent meeting or pick-up", "Coordinated with Child Protection Committee (CPC)", 
  "Temporarily suspended or removed the student from the classroom environment", 
  "Issued an incident report for administrative filing", "Escorted student to clinic or guidance office for further evaluation", 
  "Secured written statements from involved students or witnesses", "Ensured safety of others (if the case involved violence, threat or weapon)", 
  "Referred the case to the School Head or designated authority", 
  "Contacted external agencies (e.g. DSWD, PNP, Women and Children’s Desk) if needed", 
  "Initiated a case conference among teachers, guidance and admin", "Created a behavior monitoring log for follow-up", "Others (please specify)"
];

const RECOMMENDATION_OPTIONS = [
  "Recommend formal guidance counseling sessions (short-term or ongoing)",
  "Advise referral to licensed psychologist, psychiatrist, or therapist",
  "Recommend participation in behavioral intervention or correctional program",
  "Suggest conduct of home visitation (if permitted) for further context",
  "Recommend temporary suspension (if aligned with school policy)",
  "Advise close monitoring and mentoring by teacher and staff",
  "Recommend formulation of a behavior improvement plan",
  "Escorted student to clinic or guidance office for further evaluation",
  "Suggest inclusion in anger management, conflict resolution, or mental health programs",
  "Recommend mandatory parent-school conference",
  "Advise coordination with Barangay Council for the Protection of Children (BCPC), if applicable",
  "Suggest collaboration with medical or psychological professionals for continuous support",
  "Recommended exclusion from certain activities until behavior stabilizes",
  "Advise placing student under peer mentoring or buddy system (with close monitoring)",
  "Recommend follow-up assessment after a specific period (e.g. 2 weeks, 1 month)",
  "Suggest student submission of a written reflection or apology, if appropriate",
  "Recommend re-orientation of both student and parent on school policies and child protection protocols",
  "Others (please specify)"
];

export default function CriticalReportModal({ student, userName, onClose, onSuccess }: CriticalReportModalProps) {
  const { notify } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<CriticalReport>({
    studentLrn: student.lrn,
    dateOfIncident: "",
    timeOfIncident: "",
    issue: ISSUE_OPTIONS[0],
    description: "",
    actionTaken: ACTION_OPTIONS[0],
    recommendation: RECOMMENDATION_OPTIONS[0],
    reportedBy: userName,
    dateReported: new Date().toISOString(),
    recordStatus: 'On Going',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const payload = { ...form, recordStatus: 'On Going' as const };
    try {
      const response = await fetch("/api/critical-reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save critical report");
      }
      notify("success", "Critical report submitted successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      notify("error", err.message || "Failed to save critical report.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white border border-slate-200 shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-y-auto"
      >
        <div className="p-4 border-b border-red-100 flex justify-between items-center bg-red-50">
          <h2 className="font-bold text-sm text-red-800 uppercase tracking-widest flex items-center gap-2">
            {student.profilePictureUrl ? (
              <img 
                src={getDriveImageUrl(student.profilePictureUrl)} 
                alt={student.lastName}
                className="w-6 h-6 rounded-full object-cover border border-slate-200"
                referrerPolicy="no-referrer"
              />
            ) : (
              <AlertTriangle size={16} className="text-red-600" />
            )}
            Critical Incident Report - {student.lastName}, {student.firstName}
          </h2>
          <button onClick={onClose} className="text-red-400 hover:text-red-600">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="bg-slate-50 p-3 rounded border border-slate-200 text-xs space-y-1">
            <p><span className="font-bold">LRN:</span> {student.lrn}</p>
            <p><span className="font-bold">Complete Name:</span> {student.lastName}, {student.firstName} {student.middleName}</p>
            <p><span className="font-bold">Grade & Section:</span> {student.gradeLevel} - {student.section}</p>
            <p><span className="font-bold">Member of 4Ps:</span> {student.is4ps}</p>
            <p><span className="font-bold">Belong to Indigenous Group:</span> {student.isIndigenous}</p>
            <p><span className="font-bold">Parent/Guardian:</span> {student.guardianName || student.motherName || student.fatherName}</p>
            <p><span className="font-bold">Guardian Contact:</span> {student.guardianContact || student.motherContact || student.fatherContact}</p>
            <p><span className="font-bold">Address:</span> {student.houseNumber} {student.street}, {student.barangay}, {student.city}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Date of Incident</label>
              <input type="date" required value={form.dateOfIncident} onChange={(e) => setForm({...form, dateOfIncident: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs"/>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Time of Incident</label>
              <input type="time" required value={form.timeOfIncident} onChange={(e) => setForm({...form, timeOfIncident: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs"/>
            </div>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Issue and Concern</label>
            <select value={form.issue} onChange={(e) => setForm({...form, issue: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs">
              {ISSUE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Report Description (Max 100 chars)</label>
            <textarea 
              maxLength={100} 
              rows={4}
              required 
              value={form.description} 
              onChange={(e) => setForm({...form, description: e.target.value})} 
              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-sm resize-none" 
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Action Taken</label>
            <select value={form.actionTaken} onChange={(e) => setForm({...form, actionTaken: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs">
              {ACTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Recommendation</label>
            <select value={form.recommendation} onChange={(e) => setForm({...form, recommendation: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs">
              {RECOMMENDATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="bg-slate-100 p-2 rounded text-[10px] text-slate-600">
             Reported by: <span className="font-bold">{userName}</span> | Date Reported: {form.dateReported}
          </div>

          <div className="pt-2">
            <button 
              type="submit" 
              disabled={isSaving}
              className="w-full py-2.5 bg-red-600 text-white font-bold text-xs uppercase tracking-wider hover:bg-red-700 disabled:opacity-50 transition-all rounded-sm shadow-xs flex items-center justify-center gap-2 cursor-pointer"
            >
              {isSaving ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Submitting...
                </>
              ) : (
                "Submit Report"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
