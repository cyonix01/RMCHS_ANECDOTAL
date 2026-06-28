/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck, User, Phone, Key, ArrowLeft } from "lucide-react";
import { motion } from "motion/react";
import { UserAccount } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: Partial<UserAccount>) => void;
  onNavigateToRegister: () => void;
}

export default function LoginView({ onLoginSuccess, onNavigateToRegister }: LoginViewProps) {
  const [mode, setMode] = useState<"login" | "forgot">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  // Forgot Password Fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Login attempt failed.");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !firstName || !lastName || !contactNumber || !newPassword || !confirmPassword) {
      setError("Please fill in all verification and password fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 6) {
      setError("Password passcode must be at least 6 characters long.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/forgot-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          contactNumber,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Password reset attempt failed.");
      }

      setSuccessMessage(data.message);
      // Reset forgot fields
      setFirstName("");
      setLastName("");
      setContactNumber("");
      setNewPassword("");
      setConfirmPassword("");
      // Take back to login mode
      setMode("login");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during password recovery.");
    } finally {
      setIsLoading(false);
    }
  };

  const switchToForgotPassword = () => {
    setError(null);
    setSuccessMessage(null);
    setMode("forgot");
  };

  const switchToLogin = () => {
    setError(null);
    setMode("login");
  };

  return (
    <div
      id="login-card-container"
      className="w-full bg-transparent p-0"
    >
      {/* Editorial Header Row */}
      <div id="login-header-group" className="flex justify-between items-start mb-10">
        <div className="space-y-1">
          <h2 id="login-title" className="font-serif serif text-3xl text-[#102604] tracking-tight font-bold">
            {mode === "login" ? "Portal Access" : "Passcode Recovery"}
          </h2>
          <p id="login-subtitle" className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            {mode === "login" ? "Ramon Magsaysay (Cubao) High School" : "Verify Profile Credentials"}
          </p>
        </div>
        <div className="text-right shrink-0">
          <button
            id="login-register-link"
            type="button"
            onClick={onNavigateToRegister}
            className="text-[10px] uppercase font-black text-[#102604] tracking-widest border-b border-[#76DA0D] pb-0.5 hover:border-[#FFEA00] transition-colors cursor-pointer inline-flex items-center gap-1"
          >
            <span>Register profile</span>
            <ArrowRight size={10} />
          </button>
        </div>
      </div>

      {error && (
        <div id="login-error-alert" className="p-3 mb-6 bg-red-50/70 border-b border-red-200 text-red-700 font-sans text-xs flex gap-2">
          <span>⚠️</span>
          <p className="font-medium">{error}</p>
        </div>
      )}

      {successMessage && (
        <div id="login-success-alert" className="p-3 mb-6 bg-emerald-50 border-b border-emerald-200 text-emerald-800 font-sans text-xs flex gap-2">
          <span>✓</span>
          <p className="font-medium">{successMessage}</p>
        </div>
      )}

      {mode === "login" ? (
        <form id="login-form-element" onSubmit={handleLoginSubmit} className="space-y-8">
          
          {/* Email Address */}
          <div id="login-email-container" className="flex flex-col">
            <label id="login-email-label" className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
              Institutional Email (Username)
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={16} />
              </span>
              <input
                id="login-email-input"
                type="email"
                required
                placeholder="e.g. j.doe@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 editorial-input text-sm font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* Password */}
          <div id="login-pass-container" className="flex flex-col">
            <label id="login-password-label" className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
              Password Passcode
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={16} />
              </span>
              <input
                id="login-password-input"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 pr-8 editorial-input text-sm font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
              <button
                id="login-password-toggle"
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            
            <div className="flex justify-end mt-2">
              <button
                id="login-forgot-password"
                type="button"
                onClick={switchToForgotPassword}
                className="text-[10px] text-slate-400 hover:text-[#102604] hover:underline font-bold tracking-wider uppercase transition-all cursor-pointer"
              >
                Forgot Password?
              </button>
            </div>
          </div>

          {/* Primary Sync button */}
          <div className="pt-2 flex justify-end">
            <button
              id="login-submit-btn"
              type="submit"
              disabled={isLoading}
              className="btn-editorial-primary flex items-center justify-center gap-3 cursor-pointer min-w-[200px]"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate Portal</span>
                  <LogIn size={14} />
                </>
              )}
            </button>
          </div>
        </form>
      ) : (
        <form id="forgot-password-form" onSubmit={handleForgotPasswordSubmit} className="space-y-6">
          <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 border-l-2 border-[#76DA0D]">
            To reset your passcode, please verify your identity details exactly as registered in your high school profile registry.
          </p>

          {/* Email Address */}
          <div className="flex flex-col">
            <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
              Institutional Email
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Mail size={15} />
              </span>
              <input
                type="email"
                required
                placeholder="e.g. j.doe@school.edu"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* First Name */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
                First Name
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Juan"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
                />
              </div>
            </div>

            {/* Last Name */}
            <div className="flex flex-col">
              <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
                Last Name
              </label>
              <div className="relative">
                <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                  <User size={15} />
                </span>
                <input
                  type="text"
                  required
                  placeholder="e.g. Cruz"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isLoading}
                  className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
                />
              </div>
            </div>
          </div>

          {/* Contact Number */}
          <div className="flex flex-col">
            <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
              Registered Contact Number
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Phone size={15} />
              </span>
              <input
                type="text"
                required
                placeholder="e.g. 09123456789"
                value={contactNumber}
                onChange={(e) => setContactNumber(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
            </div>
          </div>

          {/* New Password */}
          <div className="flex flex-col">
            <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
              New Password Passcode
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 pr-8 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
              >
                {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div className="flex flex-col">
            <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
              Confirm New Password Passcode
            </label>
            <div className="relative">
              <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                <Lock size={15} />
              </span>
              <input
                type={showNewPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={isLoading}
                className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
              />
            </div>
          </div>

          <div className="pt-4 flex items-center justify-between">
            <button
              type="button"
              onClick={switchToLogin}
              disabled={isLoading}
              className="text-[10px] uppercase font-black text-slate-400 tracking-widest hover:text-[#102604] transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              <ArrowLeft size={12} />
              <span>Back to Login</span>
            </button>

            <button
              type="submit"
              disabled={isLoading}
              className="btn-editorial-primary flex items-center justify-center gap-2 cursor-pointer min-w-[180px] text-xs py-2"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Verify & Recover</span>
                  <Key size={12} />
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
