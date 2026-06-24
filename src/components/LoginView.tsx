/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { Mail, Lock, Eye, EyeOff, LogIn, ArrowRight, ShieldCheck } from "lucide-react";
import { motion } from "motion/react";
import { UserAccount } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: Partial<UserAccount>) => void;
  onNavigateToRegister: () => void;
}

export default function LoginView({ onLoginSuccess, onNavigateToRegister }: LoginViewProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      return;
    }

    setError(null);
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

  return (
    <div
      id="login-card-container"
      className="w-full bg-transparent p-0"
    >
      {/* Editorial Header Row */}
      <div id="login-header-group" className="flex justify-between items-start mb-12">
        <div className="space-y-1">
          <h2 id="login-title" className="font-serif serif text-3xl text-[#102604] tracking-tight font-bold">
            Portal Access
          </h2>
          <p id="login-subtitle" className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold">
            Ramon Magsaysay (Cubao) High School
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

      <form id="login-form-element" onSubmit={handleSubmit} className="space-y-8">
        
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
        </div>

        {/* Primary Sync button */}
        <div className="pt-4 flex justify-end">
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
    </div>
  );
}
