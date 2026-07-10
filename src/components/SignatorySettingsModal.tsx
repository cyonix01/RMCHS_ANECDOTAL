/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion } from "motion/react";
import { UserCheck, Save, X, Loader2 } from "lucide-react";
import { useNotification } from "./NotificationProvider";
import { SignatorySettings } from "../types";

interface SignatorySettingsModalProps {
  onClose: () => void;
}

export default function SignatorySettingsModal({ onClose }: SignatorySettingsModalProps) {
  const { notify } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<SignatorySettings>({
    preparedByName: "",
    preparedByPosition: "",
    notedByName: "",
    notedByPosition: "",
    approvedByName: "",
    approvedByPosition: "",
  });

  useEffect(() => {
    async function loadSignatories() {
      try {
        const res = await fetch("/api/signatories");
        if (res.ok) {
          const data = await res.json();
          if (data) {
            setForm({
              preparedByName: data.preparedByName || "",
              preparedByPosition: data.preparedByPosition || "",
              notedByName: data.notedByName || "",
              notedByPosition: data.notedByPosition || "",
              approvedByName: data.approvedByName || "",
              approvedByPosition: data.approvedByPosition || "",
            });
          }
        }
      } catch (err) {
        console.error("Failed to fetch signatory settings:", err);
      } finally {
        setLoading(false);
      }
    }
    loadSignatories();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/signatories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      if (res.ok) {
        notify("success", "Signatory settings saved successfully!");
        onClose();
      } else {
        const errData = await res.json();
        notify("error", errData.error || "Failed to save signatories.");
      }
    } catch (err) {
      console.error("Error saving signatory settings:", err);
      notify("error", "A network error occurred while saving signatory settings.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl bg-white border border-slate-200 shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Top Accent Lines */}
        <div className="h-1.5 w-full bg-[#102604] flex">
          <div className="w-1/3 bg-[#102604]" />
          <div className="w-1/3 bg-[#76DA0D]" />
          <div className="w-1/3 bg-[#102604]" />
        </div>

        {/* Modal Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-slate-200/50 text-[#102604]">
              <UserCheck size={18} />
            </div>
            <div>
              <h2 className="text-xs font-bold uppercase tracking-wider text-[#102604]">
                Report Signatory Settings
              </h2>
              <p className="text-[10px] text-slate-500 font-medium">
                Set names and positions for generated PDF reports
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {loading ? (
          <div className="p-12 flex flex-col items-center justify-center gap-3 text-slate-500">
            <Loader2 className="animate-spin text-[#76DA0D]" size={28} />
            <span className="text-[10px] font-bold uppercase tracking-widest">
              Loading Settings...
            </span>
          </div>
        ) : (
          <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Section 1: Prepared By */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 space-y-3">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-[#102604] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-[#76DA0D]" />
                Prepared By (Adviser or Counselor)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="preparedByName"
                    value={form.preparedByName}
                    onChange={handleChange}
                    placeholder="e.g. Maria Clara D. Santos"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Position / Designation
                  </label>
                  <input
                    type="text"
                    name="preparedByPosition"
                    value={form.preparedByPosition}
                    onChange={handleChange}
                    placeholder="e.g. Guidance Counselor / Teacher III"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Noted By */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 space-y-3">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-[#102604] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                Noted By (Guidance Coordinator or Authority)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="notedByName"
                    value={form.notedByName}
                    onChange={handleChange}
                    placeholder="e.g. Juan dela Cruz"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Position / Designation
                  </label>
                  <input
                    type="text"
                    name="notedByPosition"
                    value={form.notedByPosition}
                    onChange={handleChange}
                    placeholder="e.g. Guidance Coordinator"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Approved By */}
            <div className="p-4 bg-slate-50/50 border border-slate-100 space-y-3">
              <h3 className="text-[9px] font-bold uppercase tracking-wider text-[#102604] border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                Approved By (Principal or Approving Authority)
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    name="approvedByName"
                    value={form.approvedByName}
                    onChange={handleChange}
                    placeholder="e.g. Dr. Alejandro G. Torres"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">
                    Position / Designation
                  </label>
                  <input
                    type="text"
                    name="approvedByPosition"
                    value={form.approvedByPosition}
                    onChange={handleChange}
                    placeholder="e.g. School Principal IV"
                    className="w-full px-3 py-1.5 border border-slate-200 text-xs focus:border-[#76DA0D] focus:ring-1 focus:ring-[#76DA0D] focus:outline-none bg-white transition-all text-slate-800"
                  />
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3 bg-white">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-slate-200 font-bold text-[10px] tracking-widest uppercase text-slate-500 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#102604] hover:bg-[#1a3d07] border border-[#76DA0D] font-bold text-[10px] tracking-widest uppercase text-white shadow-md transition-all cursor-pointer disabled:opacity-75"
              >
                {saving ? (
                  <>
                    <Loader2 className="animate-spin text-[#76DA0D]" size={14} />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <Save size={14} className="text-[#76DA0D]" />
                    <span>Save Signatories</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </motion.div>
    </div>
  );
}
