/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { User, Mail, Phone, Building, Star, Lock, Eye, EyeOff, UserPlus, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { Department, Position, UserAccount } from "../types";

interface RegisterViewProps {
  onRegisterSuccess: (user: Partial<UserAccount>) => void;
  onNavigateToLogin: () => void;
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

export default function RegisterView({ onRegisterSuccess, onNavigateToLogin }: RegisterViewProps) {
  const [firstName, setFirstName] = useState("");
  const [middleName, setMiddleName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [department, setDepartment] = useState<Department | "">("");
  const [position, setPosition] = useState<Position | "">("");
  const [role, setRole] = useState<'Adviser' | 'Non-Adviser' | 'Guidance' | 'Admin'>('Non-Adviser');
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Enforce numbers-only verification for contact number
  const handleContactChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    // Strip non-digits instantly
    const digitsOnly = val.replace(/\D/g, "");
    setContactNumber(digitsOnly);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Check required fields
    if (!firstName || !lastName || !email || !contactNumber || !department || !position || !password) {
      setError("Please complete all required fields.");
      return;
    }

    // Email pattern
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Invalid Email format.");
      return;
    }

    // Numerical validation
    if (!/^\d+$/.test(contactNumber)) {
      setError("Contact number must contain numbers only.");
      return;
    }

    // Password matching
    if (password !== confirmPassword) {
      setError("Passwords do not match. Please verify your entries.");
      return;
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters for safety.");
      return;
    }

    setError(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName,
          middleName,
          lastName,
          email,
          contactNumber,
          department,
          position,
          role,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register profile.");
      }

      onRegisterSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An error occurred during account creation.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      id="register-card"
      className="w-full bg-transparent p-0"
    >
      {/* Editorial Header Row */}
      <div id="register-header" className="flex justify-between items-start mb-12">
        <div className="space-y-1">
          <h2 id="register-title" className="font-serif serif text-3xl text-[#102604] tracking-tight font-bold">
            Create Profile
          </h2>
          <p id="register-subtitle" className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            Ramon Magsaysay (Cubao) High School
          </p>
        </div>
        <div className="text-right shrink-0">
          <button
            id="register-back"
            type="button"
            onClick={onNavigateToLogin}
            className="text-[10px] uppercase font-black text-[#102604] tracking-widest border-b border-[#76DA0D] pb-0.5 hover:border-[#FFEA00] transition-colors cursor-pointer inline-flex items-center gap-1"
            title="Back to Login"
          >
            <span>Login instead</span>
            <ArrowLeft size={10} />
          </button>
        </div>
      </div>

      {error && (
        <div id="register-error-alert" className="p-3 mb-6 bg-red-50/70 border-b border-red-200 text-red-600 font-sans text-xs flex gap-2">
          <span>⚠️</span>
          <p className="font-medium">{error}</p>
        </div>
      )}

      <form id="register-form" onSubmit={handleSubmit} className="space-y-8">
        
        {/* Section 1: Personal Particulars */}
        <div id="personal-section" className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
            1. Personal Particulars
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* First Name */}
            <div id="fn-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                First Name <span className="text-red-500">*</span>
              </label>
              <input
                id="fn-input"
                type="text"
                required
                placeholder="e.g. Maria"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                disabled={isLoading}
                className="editorial-input w-full"
              />
            </div>

            {/* Middle Name */}
            <div id="mn-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Middle Name <span className="text-slate-400 text-[9px]">(Optional)</span>
              </label>
              <input
                id="mn-input"
                type="text"
                placeholder="e.g. Santos"
                value={middleName}
                onChange={(e) => setMiddleName(e.target.value)}
                disabled={isLoading}
                className="editorial-input w-full"
              />
            </div>

            {/* Last Name */}
            <div id="ln-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Last Name <span className="text-red-500">*</span>
              </label>
              <input
                id="ln-input"
                type="text"
                required
                placeholder="e.g. Lopez"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                disabled={isLoading}
                className="editorial-input w-full"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Contact Indicators */}
        <div id="contact-section" className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
            2. Reach & Communication
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Email */}
            <div id="email-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Institutional Email Address <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-email-input"
                type="email"
                required
                placeholder="maria.lopez@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="editorial-input w-full"
              />
            </div>

            {/* Contact Number */}
            <div id="contact-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Contact Number <span className="text-red-500">*</span>
              </label>
              <input
                id="reg-contact-input"
                type="text"
                required
                placeholder="e.g. 09171234567"
                value={contactNumber}
                onChange={handleContactChange}
                disabled={isLoading}
                className="editorial-input w-full text-sm font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Professional Designation */}
        <div id="designation-section" className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
            3. Professional Designation
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Department */}
            <div id="dept-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Department Name <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-department-select"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value as Department)}
                disabled={isLoading}
                className="editorial-input w-full bg-white select cursor-pointer"
              >
                <option value="" disabled hidden>
                  Select Department
                </option>
                {DEPARTMENTS.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
            </div>

            {/* Position */}
            <div id="position-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Position Rank <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-position-select"
                required
                value={position}
                onChange={(e) => setPosition(e.target.value as Position)}
                disabled={isLoading}
                className="editorial-input w-full bg-white select cursor-pointer"
              >
                <option value="" disabled hidden>
                  Select Position Rank
                </option>
                {POSITIONS.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
            </div>

            {/* Role */}
            <div id="role-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Account Role <span className="text-red-500">*</span>
              </label>
              <select
                id="reg-role-select"
                required
                value={role}
                onChange={(e) => setRole(e.target.value as any)}
                disabled={isLoading}
                className="editorial-input w-full bg-white select cursor-pointer"
              >
                <option value="Non-Adviser">Non-Adviser</option>
                <option value="Guidance">Guidance</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 4: Credentials */}
        <div id="credentials-section" className="space-y-5">
          <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider pb-1 border-b border-slate-100">
            4. Security Access Passwords
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Password */}
            <div id="reg-pass-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Create Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-password"
                  type={showPassword ? "text" : "password"}
                  required
                  placeholder="Minimum 6 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading}
                  className="editorial-input w-full pr-8"
                />
                <button
                  id="reg-password-toggle-btn"
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div id="confirm-pass-box" className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <input
                  id="reg-confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  placeholder="Identical security entry"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  disabled={isLoading}
                  className="editorial-input w-full pr-8"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
                >
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Terms agreement standard design element */}
        <div className="flex items-start gap-2.5 pt-4">
          <input
            id="terms-checkbox"
            type="checkbox"
            required
            defaultChecked
            className="w-4 h-4 mt-0.5 accent-[#76DA0D] cursor-pointer"
          />
          <label htmlFor="terms-checkbox" className="text-[11px] text-slate-500 leading-normal select-none">
            I hereby agree to the Data Privacy Act stipulations, district security rules, and authorize synchronization of my coordinates.
          </label>
        </div>

        {/* Dual button grouping */}
        <div className="pt-6 flex flex-col sm:flex-row justify-between items-center mt-8 border-t border-slate-100 gap-4">
          <button
            type="button"
            onClick={onNavigateToLogin}
            disabled={isLoading}
            className="btn-editorial-secondary w-full sm:w-auto text-center cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            id="register-submit-btn"
            type="submit"
            disabled={isLoading}
            className="btn-editorial-primary w-full sm:w-auto flex items-center justify-center gap-3 cursor-pointer"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <span>Register Account</span>
                <UserPlus size={14} />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
