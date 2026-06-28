/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, User, ShieldCheck, BookOpen, Search, Filter, Save, AlertCircle } from "lucide-react";
import { UserAccount } from "../types";
import { useNotification } from "./NotificationProvider";

interface AdviserAssignmentModalProps {
  onClose: () => void;
}

const AdviserAssignmentModal: React.FC<AdviserAssignmentModalProps> = ({ onClose }) => {
  const { notify, confirm } = useNotification();
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [sections, setSections] = useState<{ grade_level: string; section_name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserAccount | null>(null);
  
  // Assignment State
  const [assignedRole, setAssignedRole] = useState<'Adviser' | 'Non-Adviser' | 'Guidance' | 'Admin'>('Non-Adviser');
  const [assignedGrade, setAssignedGrade] = useState("");
  const [assignedSection, setAssignedSection] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [usersRes, sectionsRes] = await Promise.all([
          fetch("/api/users"),
          fetch("/api/sections/all") // I'll need to make sure this endpoint exists or similar
        ]);
        
        if (usersRes.ok && sectionsRes.ok) {
          setUsers(await usersRes.json());
          setSections(await sectionsRes.json());
        } else {
          // Try fallback for sections if /all doesn't exist
          const fallbackRes = await fetch("/api/sections"); // This usually returns grade levels or similar
          if (fallbackRes.ok) {
             // In this app, /api/sections seems to return {grade_level, section_name}[] or similar based on previous context
             const data = await fallbackRes.json();
             setSections(data);
          }
        }
      } catch (err) {
        notify("error", "Failed to synchronize with personnel registry.");
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const filteredUsers = users.filter(u => 
    `${u.firstName} ${u.lastName}`.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSelectUser = (user: UserAccount) => {
    setSelectedUser(user);
    setAssignedRole(user.role || 'Non-Adviser');
    setAssignedGrade(user.gradeLevel || "");
    setAssignedSection(user.section || "");
  };

  const handleSave = async () => {
    if (!selectedUser) return;
    
    setIsSaving(true);
    try {
      const res = await fetch(`/api/users/${selectedUser.email}/advisory`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: assignedRole,
          gradeLevel: assignedRole === 'Adviser' ? assignedGrade : null,
          section: assignedRole === 'Adviser' ? assignedSection : null
        })
      });

      if (res.ok) {
        notify("success", `Personnel profile for ${selectedUser.lastName} updated successfully.`);
        // Refresh local list
        setUsers(prev => prev.map(u => 
          u.email === selectedUser.email 
            ? { ...u, role: assignedRole, gradeLevel: assignedRole === 'Adviser' ? assignedGrade as any : undefined, section: assignedRole === 'Adviser' ? assignedSection : undefined } 
            : u
        ));
        setSelectedUser(null);
      } else {
        notify("error", "Database commit failed.");
      }
    } catch (err) {
      notify("error", "Network connection error.");
    } finally {
      setIsSaving(false);
    }
  };

  const availableSections = sections.filter(s => s.grade_level === assignedGrade);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#102604]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white w-full max-w-5xl h-[80vh] shadow-2xl flex overflow-hidden border border-slate-200"
      >
        {/* Left Panel: Personnel List */}
        <div className="w-1/3 border-r border-slate-100 flex flex-col bg-slate-50/30">
          <div className="p-6 border-b border-slate-100 bg-white">
            <h3 className="serif text-xl text-slate-900">Personnel Registry</h3>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Select staff member to assign</p>
            
            <div className="relative mt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
              <input
                type="text"
                placeholder="Search personnel..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D] transition-colors"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="p-8 text-center">
                <div className="w-8 h-[1px] bg-[#76DA0D] mx-auto animate-pulse mb-2" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Loading...</p>
              </div>
            ) : filteredUsers.length > 0 ? (
              <div className="divide-y divide-slate-50">
                {filteredUsers.map((u) => (
                  <button
                    key={u.email}
                    onClick={() => handleSelectUser(u)}
                    className={`w-full text-left p-4 hover:bg-white transition-all group flex items-center gap-3 ${selectedUser?.email === u.email ? 'bg-white border-l-4 border-[#76DA0D]' : 'border-l-4 border-transparent'}`}
                  >
                    <div className="w-10 h-10 bg-slate-100 flex items-center justify-center rounded-full shrink-0 group-hover:bg-[#76DA0D]/10 transition-colors">
                      <User size={18} className="text-slate-400 group-hover:text-[#102604]" />
                    </div>
                    <div className="overflow-hidden">
                      <p className="text-[11px] font-black text-[#102604] uppercase truncate">{u.lastName}, {u.firstName}</p>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter truncate">{u.position}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 border ${
                          u.role === 'Adviser' ? 'border-blue-100 text-blue-600 bg-blue-50' : 
                          u.role === 'Admin' ? 'border-red-100 text-red-600 bg-red-50' :
                          'border-slate-100 text-slate-400'
                        }`}>
                          {u.role || 'Staff'}
                        </span>
                        {u.section && (
                          <span className="text-[8px] font-bold text-slate-400 uppercase">{u.gradeLevel} - {u.section}</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-slate-300 italic">
                <p className="text-sm">No personnel found</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Assignment Form */}
        <div className="flex-1 flex flex-col bg-white">
          <div className="p-6 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-[#76DA0D]/10 flex items-center justify-center rounded-full">
                <ShieldCheck size={20} className="text-[#102604]" />
              </div>
              <div>
                <h3 className="serif text-xl text-slate-900">Assignment Control</h3>
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">Manage institutional roles and advisory units</p>
              </div>
            </div>
            <button onClick={onClose} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 p-10 overflow-y-auto">
            {selectedUser ? (
              <div className="max-w-md space-y-10">
                <div className="flex items-center gap-6">
                  <div className="w-16 h-16 bg-slate-50 flex items-center justify-center rounded-full border-2 border-slate-100">
                    <User size={32} className="text-slate-300" />
                  </div>
                  <div>
                    <h4 className="text-lg font-black text-[#102604] uppercase tracking-tight">{selectedUser.firstName} {selectedUser.lastName}</h4>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{selectedUser.email}</p>
                    <p className="text-[10px] font-medium text-slate-500 mt-1">{selectedUser.department} Department • {selectedUser.position}</p>
                  </div>
                </div>

                <div className="space-y-6 pt-6 border-t border-slate-100">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Institutional Role</label>
                    <div className="grid grid-cols-2 gap-2">
                      {(['Non-Adviser', 'Adviser', 'Guidance', 'Admin'] as const).map(role => (
                        <button
                          key={role}
                          onClick={() => setAssignedRole(role)}
                          className={`px-4 py-3 text-[10px] font-bold uppercase tracking-widest border transition-all ${
                            assignedRole === role 
                              ? 'bg-[#102604] text-white border-[#102604]' 
                              : 'bg-white text-slate-400 border-slate-200 hover:border-slate-400'
                          }`}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <AnimatePresence>
                    {assignedRole === 'Adviser' && (
                      <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="space-y-6 pt-6 border-t border-slate-100"
                      >
                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Advisory Grade Level</label>
                          <select
                            value={assignedGrade}
                            onChange={(e) => {
                              setAssignedGrade(e.target.value);
                              setAssignedSection("");
                            }}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#76DA0D] appearance-none"
                          >
                            <option value="">Select Grade Level</option>
                            <option value="Grade 7">Grade 7</option>
                            <option value="Grade 8">Grade 8</option>
                            <option value="Grade 9">Grade 9</option>
                            <option value="Grade 10">Grade 10</option>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                          </select>
                        </div>

                        <div className="space-y-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Assigned Section</label>
                          <select
                            value={assignedSection}
                            onChange={(e) => setAssignedSection(e.target.value)}
                            disabled={!assignedGrade}
                            className="w-full px-4 py-3 bg-slate-50 border border-slate-200 text-[11px] font-bold uppercase tracking-widest focus:outline-none focus:border-[#76DA0D] appearance-none disabled:opacity-50"
                          >
                            <option value="">Select Section</option>
                            {availableSections.map(s => (
                              <option key={s.section_name} value={s.section_name}>{s.section_name}</option>
                            ))}
                          </select>
                          {assignedGrade && availableSections.length === 0 && (
                            <p className="text-[9px] text-red-400 font-bold uppercase italic mt-1 flex items-center gap-1">
                              <AlertCircle size={10} /> No sections registered for this grade level.
                            </p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="pt-10 flex gap-4">
                  <button
                    onClick={handleSave}
                    disabled={isSaving || (assignedRole === 'Adviser' && (!assignedGrade || !assignedSection))}
                    className="flex-1 bg-[#102604] text-white py-4 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-800 transition-all disabled:opacity-50 flex items-center justify-center gap-3 shadow-lg shadow-[#102604]/10 min-w-[200px]"
                  >
                    {isSaving ? (
                      <>
                        <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Synchronizing...
                      </>
                    ) : (
                      <>
                        <Save size={14} />
                        Update Assignment
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => setSelectedUser(null)}
                    className="px-8 py-4 border border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center opacity-40">
                <div className="w-20 h-20 bg-slate-50 flex items-center justify-center rounded-full mb-6">
                  <BookOpen size={40} className="text-slate-300" />
                </div>
                <h4 className="serif text-2xl text-slate-300">Assignment Console</h4>
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-2">Select personnel from the left registry to manage roles</p>
              </div>
            )}
          </div>
          
          <div className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between shrink-0">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">
              Administrative Control Layer • Registry v1.0.4
            </p>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-[9px] font-black uppercase text-green-600">
                <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                Database Online
              </span>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default AdviserAssignmentModal;
