import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, X, Save } from 'lucide-react';
import { useNotification } from './NotificationProvider';
import { AdminPasswords } from '../types';

interface Props {
  onClose: () => void;
}

export const AdminPasswordsModal: React.FC<Props> = ({ onClose }) => {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwords, setPasswords] = useState<AdminPasswords>({
    clearReports: "",
    clearStudents: "",
    deleteTeacher: ""
  });

  useEffect(() => {
    fetch("/api/admin/passwords")
      .then(res => res.json())
      .then(data => {
        if (!data.error) {
          setPasswords(data);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (field: keyof AdminPasswords, value: string) => {
    setPasswords(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/passwords", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwords)
      });
      if (res.ok) {
        notify("success", "Admin passwords successfully updated.");
        onClose();
      } else {
        const errData = await res.json().catch(()=>({}));
        notify("error", errData.error || "Failed to update admin passwords.");
      }
    } catch (err) {
      notify("error", "Network error while saving admin passwords.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-[#102604]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="bg-white w-full max-w-md shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full">
              <Shield size={20} className="text-[#102604]" />
            </div>
            <div>
              <h2 className="text-xl font-serif text-slate-900 leading-none">Admin Passwords</h2>
              <p className="text-[11px] text-slate-500 mt-1 uppercase tracking-widest font-bold">Security Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar flex-1">
          {loading ? (
            <div className="py-12 flex justify-center">
              <div className="w-6 h-6 border-2 border-[#76DA0D] border-t-transparent rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Reports Password</label>
                <input
                  type="text"
                  value={passwords.clearReports}
                  onChange={(e) => handleChange("clearReports", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] transition-all"
                  placeholder="e.g. NoMoreReporting"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Clear Students Password</label>
                <input
                  type="text"
                  value={passwords.clearStudents}
                  onChange={(e) => handleChange("clearStudents", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] transition-all"
                  placeholder="e.g. VacationTime"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-700 uppercase tracking-widest">Delete Teacher Password</label>
                <input
                  type="text"
                  value={passwords.deleteTeacher}
                  onChange={(e) => handleChange("deleteTeacher", e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] transition-all"
                  placeholder="e.g. HolidayTime"
                />
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-100 bg-slate-50 shrink-0 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-6 py-2.5 text-[11px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || loading}
            className="flex items-center gap-2 px-6 py-2.5 bg-[#102604] hover:bg-[#1a3d06] text-white text-[11px] font-bold uppercase tracking-widest transition-colors disabled:opacity-50"
          >
            <Save size={16} />
            <span>{saving ? 'Saving...' : 'Save Settings'}</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
