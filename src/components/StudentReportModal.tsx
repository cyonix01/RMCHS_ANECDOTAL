import React, { useState } from "react";
import { motion } from "motion/react";
import { X, FileText } from "lucide-react";
import { Student, Report } from "../types";
import { useNotification } from "./NotificationProvider";

interface StudentReportModalProps {
  student: Student;
  userName: string;
  onClose: () => void;
}

const ISSUE_OPTIONS = [
  "Habitual tardiness", "Inattentiveness / sleeping in class", "Talking back to teachers", 
  "Dress code violations", "Using gadgets during class hour without permission", 
  "Minor class disturbances (e.g. noise, jokes)", "Cutting classes / Unexcused absences", 
  "Copying assignments or mild cheating", "Peer misunderstanding or minor peer conflicts", 
  "Lack of hygiene or cleanliness issues", "Vandalism (minor cases like writing on desks)", "Others (please specify)"
];

const ACTION_OPTIONS = [
  "Gave verbal warning to the student",
  "Conducted brief one-on-one counseling or conversation",
  "Documented the behavior in the anecdotal record",
  "Informed the class adviser or guidance office",
  "Called the attention of the student during class",
  "Separated the student temporarily from the group",
  "Confiscated gadget or prohibited item",
  "Gave a reflective activity (e.g. writing what was done wrong and how to improve)",
  "Noted the incident for further reference or monitoring",
  "Held a short peer mediation session (if involving classmates)",
  "Referred to class adviser for further handling",
  "Reprimanded with emphasis on expected behavior",
  "Issued a reminder on school/classroom rules",
  "Notified parent / guardian through communication notebook or call",
  "Others (please specify)"
];

const RECOMMENDATION_OPTIONS = [
  "Encourage student to attend guidance sessions",
  "Recommend consistent monitoring by subject teacher or adviser",
  "Suggest regular parent check – in or home monitoring",
  "Recommend participation in character building or values formation activities",
  "Advise improved time management and task prioritization",
  "Recommend journaling or reflection writing at home",
  "Suggest limiting gadget use at hoe or implementing screen time rules",
  "Encourage student to observe classroom rules consistently",
  "Recommend peer mentoring or buddy system",
  "Advise parent to talk to the student about the incident at home",
  "Suggest inclusion in homeroom guidance follow-up",
  "Recommend positive reinforcement strategies by teachers/parents",
  "Advise more active engagement in school – based activities to improve behavior",
  "Suggest teacher – parent conference if behavior becomes repetitive",
  "Recommend behavior contract for repeated petit issues",
  "Others (please specify)"
];

export default function StudentReportModal({ student, userName, onClose }: StudentReportModalProps) {
  const { notify } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Report>({
    studentLrn: student.lrn,
    dateOfIncident: "",
    timeOfIncident: "",
    issue: ISSUE_OPTIONS[0],
    description: "",
    actionTaken: ACTION_OPTIONS[0],
    recommendation: RECOMMENDATION_OPTIONS[0],
    reportedBy: userName,
    dateReported: new Date().toISOString(),
    individualFactors: [],
    familyCommunityBehaviorFactors: [],
    referralRecommendation: "N/A",
    initialAssessmentMadeBy: "N/A",
    designation: "N/A",
    recordStatus: 'On Going',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save report");
      }
      notify("success", "Student report saved successfully!");
      onClose();
    } catch (err: any) {
      console.error(err);
      notify("error", err.message || "Failed to save report. Please try again.");
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
        <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
          <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} className="text-[#76DA0D]" />
            Student Report
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
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
              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#76DA0D]/20 focus:border-[#76DA0D] rounded-sm resize-none" 
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Action Taken</label>
            <select value={form.actionTaken} onChange={(e) => setForm({...form, actionTaken: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#76DA0D]/20 focus:border-[#76DA0D] rounded-sm bg-white">
              {ACTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Recommendation</label>
            <select value={form.recommendation} onChange={(e) => setForm({...form, recommendation: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-[#76DA0D]/20 focus:border-[#76DA0D] rounded-sm bg-white">
              {RECOMMENDATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="bg-slate-100 p-2 rounded text-[10px] text-slate-600">
             Reported by: <span className="font-bold">{userName}</span> | Date Reported: {form.dateReported}
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full py-2 bg-[#76DA0D] text-white text-xs font-bold uppercase tracking-wider hover:bg-[#88F015] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Save Report"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
