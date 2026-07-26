import React, { useState } from "react";
import { LogIn, UserCircle, Key, AlertCircle, Eye, EyeOff, ShieldAlert, Loader2 } from "lucide-react";
import ForgotPasswordModal from "./ForgotPasswordModal";

import { UserAccount } from "../types";

interface LoginViewProps {
  onLoginSuccess: (user: Partial<UserAccount>) => void;
  onNavigateToRegister: () => void;
  sessionNotice?: string | null;
}

export default function LoginView({ onLoginSuccess, onNavigateToRegister, sessionNotice }: LoginViewProps) {
  const [rememberMe, setRememberMe] = useState(() => {
    return !!localStorage.getItem("teacher_portal_remember_email");
  });
  const [email, setEmail] = useState(() => {
    return localStorage.getItem("teacher_portal_remember_email") || "";
  });
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  
  const [isForgotModalOpen, setIsForgotModalOpen] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in both email and password fields.");
      return;
    }

    if (rememberMe) {
      localStorage.setItem("teacher_portal_remember_email", email);
    } else {
      localStorage.removeItem("teacher_portal_remember_email");
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
        throw new Error(data.error || "Login failed");
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred during authentication.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full relative">
      {/* Header section */}
      <div className="mb-10 space-y-3">
        <h2 className="text-[#1A1A1A] text-2xl md:text-3xl font-serif font-black tracking-tight leading-none">
          Sign In
        </h2>
        <p className="text-slate-500 font-sans text-xs sm:text-sm font-medium leading-relaxed max-w-sm">
          Access your Counseling & Academic Records Engagement dashboard.
        </p>
      </div>

      {sessionNotice && (
        <div className="mb-6 bg-amber-50 text-amber-800 p-4 flex items-start gap-3 border border-amber-200 text-xs shadow-sm">
          <ShieldAlert size={16} className="mt-0.5 shrink-0 text-amber-600" />
          <p className="font-medium leading-relaxed">{sessionNotice}</p>
        </div>
      )}

      {error && (
        <div className="mb-6 bg-red-50 text-red-700 p-4 flex items-start gap-3 border border-red-100 text-xs shadow-sm">
          <AlertCircle size={15} className="mt-0.5 shrink-0" />
          <p className="font-medium leading-relaxed">{error}</p>
        </div>
      )}

      <form id="login-form" onSubmit={handleLoginSubmit} className="space-y-6">
        {/* Email Address */}
        <div id="login-email-container" className="flex flex-col">
          <label id="login-email-label" className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
            Email Address
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <UserCircle size={15} />
            </span>
            <input
              id="login-email-input"
              type="email"
              required
              placeholder="e.g. j.doe@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
            />
          </div>
        </div>

        {/* Password */}
        <div id="login-password-container" className="flex flex-col">
          <label id="login-password-label" className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-2">
            Password
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
              <Key size={15} />
            </span>
            <input
              id="login-password-input"
              type={showPassword ? "text" : "password"}
              required
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={isLoading}
              className="w-full pl-10 pr-10 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A] tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
          <div className="flex items-center justify-between mt-3">
            <label id="login-remember-me-container" className="flex items-center gap-2 cursor-pointer select-none">
              <input
                id="login-remember-me-checkbox"
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => {
                  const checked = e.target.checked;
                  setRememberMe(checked);
                  if (!checked) {
                    localStorage.removeItem("teacher_portal_remember_email");
                  }
                }}
                className="w-3.5 h-3.5 accent-[#102604] border-slate-300 rounded-none cursor-pointer"
              />
              <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                Remember Me
              </span>
            </label>
            <button
              id="login-forgot-password"
              type="button"
              onClick={() => setIsForgotModalOpen(true)}
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
            className="btn-editorial-primary flex items-center justify-center gap-3 cursor-pointer min-w-[200px] disabled:opacity-75 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={16} className="animate-spin text-[#76DA0D]" />
                <span>Signing In...</span>
              </>
            ) : (
              <>
                <span>Sign In</span>
                <LogIn size={14} />
              </>
            )}
          </button>
        </div>
      </form>

      {/* Alternative actions block */}
      <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col gap-4">
        <p className="text-[11px] text-slate-500 leading-relaxed max-w-sm">
          Don't have an account? Create one to access the platform.
        </p>
        <div className="flex">
          <button
            id="login-register-btn"
            type="button"
            onClick={onNavigateToRegister}
            disabled={isLoading}
            className="text-xs font-bold uppercase tracking-wider text-[#102604] hover:text-[#76DA0D] border-b-2 border-transparent hover:border-[#76DA0D] transition-all pb-1 cursor-pointer"
          >
            Register Profile →
          </button>
        </div>
      </div>

      <ForgotPasswordModal 
        isOpen={isForgotModalOpen} 
        onClose={() => setIsForgotModalOpen(false)} 
      />
    </div>
  );
}
