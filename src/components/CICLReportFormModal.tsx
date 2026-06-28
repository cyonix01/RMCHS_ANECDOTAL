import React, { useState } from "react";
import { motion } from "motion/react";
import { X, FileText } from "lucide-react";
import { Student, Report } from "../types";
import { useNotification } from "./NotificationProvider";

interface CICLReportFormModalProps {
  student: Student;
  userName: string;
  onClose: () => void;
  onSuccess?: () => void;
}

const OFFENSE_OPTIONS = [
  "Theft", "Robbery", "Physical injuries", "Sexual harassment", "Rape", "Homicide", "Murder", "Drug-related"
];

const INDIVIDUAL_FACTORS_OPTIONS = [
  "History of substance/alcohol abuse",
  "Involvement in gangs",
  "Sudden outbursts of anger/irritability in school",
  "Traumatic experiences of the child",
  "Recent suicide attempts or suicidal ideation",
  "Observed to be depressed, anxious, out of focus",
  "Constant somatic complaints",
  "Reported/Noted thought disturbances",
  "Involvement in positive youth development activity (identify):"
];

const FAMILY_COMMUNITY_FACTORS_OPTIONS = [
  "Victim of neglect",
  "No parents or guardian in household",
  "History of parental criminal behavior",
  "Witness to domestic violence",
  "Victim of bullying in school",
  "Severe behavior problems"
];

const REFERRAL_RECOMMENDATION_OPTIONS = [
  "Referral to LSWDO for immediate intervention (within 8 hrs)",
  "Initial Assessment: For further investigation before referral (within 24 hrs)"
];

const ACTION_OPTIONS = [
  "Informed Guidance Counselor", "Informed Parent/Guardian", "Informed School Head", "Referred to DSWD", "Other"
];

const RECOMMENDATION_OPTIONS = [
  "Counseling", "Behavioral Contract", "Community Service", "Parent-Teacher Conference", "Other"
];

export default function CICLReportFormModal({ student, userName, onClose, onSuccess }: CICLReportFormModalProps) {
  const { notify } = useNotification();
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<Report>({
    studentLrn: student.lrn,
    dateOfIncident: "",
    timeOfIncident: "",
    issue: OFFENSE_OPTIONS[0],
    description: "",
    actionTaken: ACTION_OPTIONS[0],
    recommendation: RECOMMENDATION_OPTIONS[0],
    individualFactors: [],
    familyCommunityBehaviorFactors: [],
    individualFactorsSpecify: "",
    referralRecommendation: REFERRAL_RECOMMENDATION_OPTIONS[0],
    initialAssessmentMadeBy: "",
    designation: "",
    recordStatus: 'On Going',
    reportedBy: userName,
    dateReported: new Date().toISOString(),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({...form, type: 'CICL'}), 
      });
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save report");
      }
      notify("success", "CICL report saved successfully!");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      notify("error", err.message || "Failed to save CICL report.");
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
          <h2 className="font-bold text-sm text-red-800 uppercase tracking-widest flex items-center gap-2">
            <FileText size={16} />
            CICL Student Report
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
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Types of Offenses Committed</label>
            <select value={form.issue} onChange={(e) => setForm({...form, issue: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs">
              {OFFENSE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Individual Factors</label>
            {INDIVIDUAL_FACTORS_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                <input 
                  type="checkbox" 
                  checked={form.individualFactors.includes(opt)}
                  onChange={(e) => {
                    const factors = e.target.checked 
                      ? [...form.individualFactors, opt]
                      : form.individualFactors.filter(f => f !== opt);
                    setForm({...form, individualFactors: factors});
                  }}
                />
                {opt}
              </label>
            ))}
            <input 
              type="text" 
              maxLength={100}
              placeholder="Specify activity..."
              value={form.individualFactorsSpecify}
              onChange={(e) => setForm({...form, individualFactorsSpecify: e.target.value})}
              className="w-full mt-1 px-3 py-2 border border-slate-300 text-xs"
            />
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Family/Community & School Behavior</label>
            {FAMILY_COMMUNITY_FACTORS_OPTIONS.map(opt => (
              <label key={opt} className="flex items-center gap-2 text-xs text-slate-600 mb-1">
                <input 
                  type="checkbox" 
                  checked={form.familyCommunityBehaviorFactors.includes(opt)}
                  onChange={(e) => {
                    const factors = e.target.checked 
                      ? [...form.familyCommunityBehaviorFactors, opt]
                      : form.familyCommunityBehaviorFactors.filter(f => f !== opt);
                    setForm({...form, familyCommunityBehaviorFactors: factors});
                  }}
                />
                {opt}
              </label>
            ))}
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Referral Recommendation</label>
            <select value={form.referralRecommendation} onChange={(e) => setForm({...form, referralRecommendation: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs">
              {REFERRAL_RECOMMENDATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Initial assessment made by</label>
              <input type="text" required value={form.initialAssessmentMadeBy} onChange={(e) => setForm({...form, initialAssessmentMadeBy: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs"/>
            </div>
            <div>
              <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Designation</label>
              <input type="text" required value={form.designation} onChange={(e) => setForm({...form, designation: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs"/>
            </div>
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
            <select value={form.actionTaken} onChange={(e) => setForm({...form, actionTaken: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-sm bg-white">
              {ACTION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Recommendation</label>
            <select value={form.recommendation} onChange={(e) => setForm({...form, recommendation: e.target.value})} className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 rounded-sm bg-white">
              {RECOMMENDATION_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
            </select>
          </div>

          <div className="bg-slate-100 p-2 rounded text-[10px] text-slate-600">
             Reported by: <span className="font-bold">{userName}</span> | Date Reported: {form.dateReported}
          </div>

          <button 
            type="submit" 
            disabled={isSaving}
            className="w-full py-2 bg-red-500 text-white text-xs font-bold uppercase tracking-wider hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </>
            ) : (
              "Save CICL Report"
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
