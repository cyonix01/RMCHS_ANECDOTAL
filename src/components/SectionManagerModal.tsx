/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, Plus, Trash2, Edit, X, Save, AlertCircle } from "lucide-react";
import { useNotification } from "./NotificationProvider";

interface Section {
  gradeLevel: string;
  name: string;
}

interface SectionManagerModalProps {
  onClose: () => void;
}

const GRADE_LEVELS = [
  "Grade 7", "Grade 8", "Grade 9", "Grade 10", "Grade 11", "Grade 12"
];

const SectionManagerModal: React.FC<SectionManagerModalProps> = ({ onClose }) => {
  const { notify, confirm } = useNotification();
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState("Grade 7");
  const [isAdding, setIsAdding] = useState(false);
  const [isEditing, setIsEditing] = useState<Section | null>(null);
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const fetchSections = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/sections?gradeLevel=${encodeURIComponent(selectedGrade)}`);
      if (res.ok) {
        const data = await res.json();
        setSections(data.map((name: string) => ({ gradeLevel: selectedGrade, name })));
      }
    } catch (err) {
      console.error("Failed to fetch sections:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSections();
  }, [selectedGrade]);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    try {
      const res = await fetch("/api/admin/sections", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ gradeLevel: selectedGrade, name: newName.trim() })
      });
      if (res.ok) {
        setNewName("");
        setIsAdding(false);
        notify("success", "New section added to registry.");
        fetchSections();
      } else {
        const data = await res.json();
        const msg = data.error || "Failed to add section.";
        setError(msg);
        notify("error", msg);
      }
    } catch (err) {
      setError("Error connecting to server.");
      notify("error", "Network connection failed.");
    }
  };

  const handleUpdate = async () => {
    if (!isEditing || !newName.trim()) return;
    try {
      const res = await fetch("/api/admin/sections", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          oldGrade: isEditing.gradeLevel,
          oldName: isEditing.name,
          newGrade: selectedGrade,
          newName: newName.trim()
        })
      });
      if (res.ok) {
        setNewName("");
        setIsEditing(null);
        notify("success", "Section details updated successfully.");
        fetchSections();
      } else {
        const data = await res.json();
        const msg = data.error || "Failed to update section.";
        setError(msg);
        notify("error", msg);
      }
    } catch (err) {
      setError("Error connecting to server.");
      notify("error", "Network connection failed.");
    }
  };

  const handleDelete = async (section: Section) => {
    confirm({
      title: "Delete Section",
      message: `Are you sure you want to permanently delete section: ${section.name}? All student associations with this section might be affected.`,
      confirmText: "Delete Section",
      variant: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/admin/sections?gradeLevel=${encodeURIComponent(section.gradeLevel)}&name=${encodeURIComponent(section.name)}`, {
            method: "DELETE"
          });
          if (res.ok) {
            notify("success", "Section removed from registry.");
            fetchSections();
          } else {
            notify("error", "Failed to remove section.");
          }
        } catch (err) {
          notify("error", "Network error during deletion.");
        }
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#102604]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-white">
          <div className="flex items-center gap-3">
            <Layers size={20} className="text-blue-500" />
            <h3 className="serif font-serif text-xl text-slate-900">Section Management</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar - Grade Levels */}
          <div className="w-48 bg-slate-50 border-r border-slate-100 p-4 space-y-1">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4 px-2">Grade Levels</p>
            {GRADE_LEVELS.map(grade => (
              <button
                key={grade}
                onClick={() => setSelectedGrade(grade)}
                className={`w-full text-left px-3 py-2 text-[11px] font-bold uppercase tracking-wider transition-all ${
                  selectedGrade === grade 
                  ? 'bg-blue-500 text-white shadow-md shadow-blue-100' 
                  : 'text-slate-500 hover:bg-slate-200'
                }`}
              >
                {grade}
              </button>
            ))}
          </div>

          {/* Main Content - Section List */}
          <div className="flex-1 p-6 overflow-y-auto bg-white flex flex-col">
            <div className="flex items-center justify-between mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">
                {selectedGrade} Sections
              </h4>
              <button
                onClick={() => {
                  setIsAdding(true);
                  setIsEditing(null);
                  setNewName("");
                  setError(null);
                }}
                className="flex items-center gap-2 px-3 py-1.5 bg-[#102604] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-colors"
              >
                <Plus size={14} />
                <span>Add Section</span>
              </button>
            </div>

            <AnimatePresence mode="wait">
              {(isAdding || isEditing) && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="mb-6 p-4 bg-slate-50 border border-slate-200"
                >
                  <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">
                    {isAdding ? "New Section Name" : "Edit Section Name"}
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      autoFocus
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="e.g. STE- Eduardo San Juan"
                      className="flex-1 px-3 py-2 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={isAdding ? handleAdd : handleUpdate}
                      className="px-4 py-2 bg-blue-500 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-blue-600 transition-colors flex items-center gap-2"
                    >
                      <Save size={14} />
                      <span>Save</span>
                    </button>
                    <button
                      onClick={() => {
                        setIsAdding(false);
                        setIsEditing(null);
                        setNewName("");
                        setError(null);
                      }}
                      className="px-4 py-2 bg-white border border-slate-200 text-slate-500 text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                  {error && (
                    <div className="mt-2 flex items-center gap-1.5 text-red-500 text-[9px] font-bold uppercase">
                      <AlertCircle size={12} />
                      <span>{error}</span>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-2">
              {loading ? (
                <div className="py-12 text-center text-slate-400 italic text-[11px]">Loading sections...</div>
              ) : sections.length > 0 ? (
                sections.map((section, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-white border border-slate-100 hover:border-slate-300 transition-colors group"
                  >
                    <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">{section.name}</span>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setIsEditing(section);
                          setIsAdding(false);
                          setNewName(section.name);
                          setError(null);
                        }}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 transition-colors"
                        title="Edit Section"
                      >
                        <Edit size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(section)}
                        className="p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                        title="Delete Section"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center text-slate-400 italic text-[11px]">
                  No sections registered for this grade level.
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SectionManagerModal;
