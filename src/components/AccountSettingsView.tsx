/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Phone, Building, Star, Lock, Eye, EyeOff, Save, X, Settings } from "lucide-react";
import { motion } from "motion/react";
import { Department, Position, UserAccount } from "../types";
import { useNotification } from "./NotificationProvider";

interface AccountSettingsViewProps {
  user: Partial<UserAccount>;
  onClose: () => void;
  onUpdateSuccess: (updatedUser: Partial<UserAccount>) => void;
}

const DEPARTMENTS: Department[] = [
  "English",
  "Mathematics",
  "Science",
  "Filipino",
  "ESP / Values Education",
  "Araling Panlipunan",
  "TLE",
  "MAPEH",
  "Admin (NTP)",
];

const POSITIONS: Position[] = [
  "Teacher I",
  "Teacher II",
  "Teacher III",
  "Teacher IV",
  "Teacher V",
  "Teacher VI",
  "Teacher VII",
  "Master Teacher I",
  "Master Teacher II",
  "Master Teacher III",
  "Master Teacher IV",
  "Head Teacher I",
  "Head Teacher II",
  "Head Teacher III",
  "Head Teacher IV",
  "Head Teacher V",
  "Head Teacher VI",
  "Guidance Counselor",
  "Clinic Nurse/Teacher",
];

export default function AccountSettingsView({ user, onClose, onUpdateSuccess }: AccountSettingsViewProps) {
  const { notify, confirm } = useNotification();
  const [firstName, setFirstName] = useState(user.firstName || "");
  const [middleName, setMiddleName] = useState(user.middleName || "");
  const [lastName, setLastName] = useState(user.lastName || "");
  const [contactNumber, setContactNumber] = useState(user.contactNumber || "");
  const [department, setDepartment] = useState<Department>(user.department as Department);
  const [position, setPosition] = useState<Position>(user.position as Position);
  const [role, setRole] = useState(user.role || "Non-Adviser");
  const [gradeLevel, setGradeLevel] = useState(user.gradeLevel || "");
  const [section, setSection] = useState(user.section || "");
  const [sections, setSections] = useState<string[]>([]);

  React.useEffect(() => {
    if (gradeLevel) {
      console.log('Fetching sections for:', gradeLevel);
      fetch(`/api/sections?gradeLevel=${encodeURIComponent(gradeLevel)}`)
        .then(res => res.json())
        .then(data => setSections(Array.from(new Set(data))))
        .catch(err => console.error('Error fetching sections:', err));
    }
  }, [gradeLevel]);

  // Verification Credentials
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    const digitsOnly = val.replace(/\D/g, "");
    setContactNumber(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    // Validate inputs
    if (!firstName || !lastName || !contactNumber || !department || !position || !role) {
      setError("Please complete all required fields.");
      return;
    }

    if (role === 'Adviser' && (!gradeLevel || !section)) {
      setError("Grade Level and Section are required for Advisers.");
      return;
    }

    if (!currentPassword) {
      setError("You must enter your Current Password to save any edits.");
      return;
    }

    if (newPassword && newPassword !== confirmNewPassword) {
      setError("New password entries do not match.");
      return;
    }

    if (newPassword && newPassword.length < 6) {
      setError("New password must be at least 6 characters long.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch("/api/update-profile", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email: user.email,
          firstName,
          middleName,
          lastName,
          contactNumber,
          department,
          position,
          role,
          gradeLevel: role === 'Adviser' ? gradeLevel : undefined,
          section: role === 'Adviser' ? section : undefined,
          currentPassword,
          newPassword: newPassword || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Profile revision failed.");
      }

      setSuccess("Profile settings successfully updated in the database!");
      notify("success", "Institutional profile synchronized successfully.");
      onUpdateSuccess(data.user);
      
      // Wipe fields for безопасности
      setCurrentPassword("");
      setNewPassword("");
      setConfirmNewPassword("");

      // Automatically hide after some seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred while updating profile.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="settings-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <motion.div
        id="settings-modal"
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        className="w-full max-w-xl bg-white border border-slate-300 rounded-none shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header bar */}
        <div id="settings-header" className="px-6 py-4 border-b border-slate-200 bg-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <Settings className="text-[#76DA0D]" size={16} />
            <h3 className="font-serif serif text-lg font-bold text-slate-900 tracking-tight">Account Settings Profile</h3>
          </div>
          <button
            id="settings-close"
            onClick={onClose}
            className="p-1 px-2 rounded-none text-slate-400 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable container */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div id="settings-error-alert" className="p-3 bg-red-50 border-b border-red-250 text-red-700 text-xs font-sans flex gap-2">
              <span>⚠️</span>
              <p className="font-medium">{error}</p>
            </div>
          )}

          {success && (
            <div id="settings-success-alert" className="p-3 bg-emerald-50 border-b border-emerald-250 text-emerald-800 text-xs font-sans flex gap-2">
              <span>✅</span>
              <p className="font-semibold">{success}</p>
            </div>
          )}

          <form id="settings-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Account Metadata Row */}
            <div id="settings-username-box" className="p-4 bg-[#76DA0D]/10 border border-[#76DA0D]/30 rounded-none flex justify-between items-center">
              <div>
                <p className="text-[9px] uppercase font-bold text-slate-500 tracking-widest label-micro">Logged Username (immutable)</p>
                <p className="text-sm font-semibold font-mono text-[#102604] mt-1">{user.email}</p>
              </div>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest border border-slate-300 px-2 py-0.5 whitespace-nowrap">Primary ID</span>
            </div>

            {/* Profile Fields section */}
            <div className="space-y-5">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
                Personal Information Coordinates
              </h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">First Name</label>
                  <input
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    disabled={isLoading}
                    className="editorial-input w-full"
                  />
                </div>
                
                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Middle Name</label>
                  <input
                    type="text"
                    value={middleName}
                    onChange={(e) => setMiddleName(e.target.value)}
                    disabled={isLoading}
                    className="editorial-input w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Last Name</label>
                  <input
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    disabled={isLoading}
                    className="editorial-input w-full"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
                <div className="flex flex-col md:col-span-1">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Contact Number</label>
                  <input
                    type="text"
                    required
                    value={contactNumber}
                    onChange={handleContactChange}
                    disabled={isLoading}
                    className="editorial-input w-full text-sm font-mono"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Department</label>
                  <select
                    required
                    value={department}
                    onChange={(e) => setDepartment(e.target.value as Department)}
                    disabled={isLoading}
                    className="editorial-input w-full bg-white select cursor-pointer"
                  >
                    {DEPARTMENTS.map((dept) => (
                      <option key={dept} value={dept}>
                        {dept}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Position Rank</label>
                  <select
                    required
                    value={position}
                    onChange={(e) => setPosition(e.target.value as Position)}
                    disabled={isLoading}
                    className="editorial-input w-full bg-white select cursor-pointer"
                  >
                    {POSITIONS.map((pos) => (
                      <option key={pos} value={pos}>
                        {pos}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Role</label>
                  <div className="editorial-input w-full bg-slate-50 border-slate-200 text-slate-400 font-bold uppercase tracking-widest flex items-center px-4 h-10">
                    {role}
                  </div>
                </div>

                {role === 'Adviser' && (
                  <>
                    <div className="flex flex-col">
                      <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Grade Level</label>
                      <div className="editorial-input w-full bg-slate-50 border-slate-200 text-slate-400 font-bold uppercase tracking-widest flex items-center px-4 h-10">
                        {gradeLevel || "Not Assigned"}
                      </div>
                    </div>

                    <div className="flex flex-col">
                      <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Section</label>
                      <div className="editorial-input w-full bg-slate-50 border-slate-200 text-slate-400 font-bold uppercase tracking-widest flex items-center px-4 h-10">
                        {section || "Not Assigned"}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Change Password settings */}
            <div className="space-y-5 pt-4 border-t border-slate-100">
              <h4 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
                Change Account Credentials <span className="text-slate-400 font-normal lowercase">(optional)</span>
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">New Password</label>
                  <input
                    type="password"
                    placeholder="Verify passcode criteria"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="editorial-input w-full"
                  />
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1 block">Confirm Password</label>
                  <input
                    type="password"
                    placeholder="Identical security copy"
                    value={confirmNewPassword}
                    onChange={(e) => setConfirmNewPassword(e.target.value)}
                    disabled={isLoading}
                    className="editorial-input w-full"
                  />
                </div>
              </div>
            </div>

            {/* Verification required before edits */}
            <div className="space-y-3 pt-4 border-t border-slate-100 bg-[#76DA0D]/10 p-4 rounded-none border border-[#76DA0D]/30">
              <div>
                <label className="text-[10px] font-bold text-[#102604] uppercase tracking-widest flex items-center gap-1">
                  <Lock size={12} />
                  <span>Confirm registered password <span className="text-red-500">*</span></span>
                </label>
                <p className="text-[10px] text-slate-500 font-sans mt-1 leading-normal">
                  To secure changes, please provide your current passcode before database update.
                </p>
              </div>

              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="Input registered current passcode"
                  required
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="editorial-input w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-3 justify-end pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={onClose}
                className="btn-editorial-secondary cursor-pointer"
              >
                Close Settings
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="btn-editorial-primary flex items-center justify-center gap-2 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Save size={14} />
                    <span>Save Changes</span>
                  </>
                )}
              </button>
            </div>

          </form>
        </div>
      </motion.div>
    </div>
  );
}
