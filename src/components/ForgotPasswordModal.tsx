import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, ShieldCheck, Lock, Eye, EyeOff, ArrowLeft, ArrowRight, Key, X, AlertCircle, CheckCircle2 } from 'lucide-react';

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [mode, setMode] = useState<"forgot_request" | "forgot_verify">("forgot_request");
  const [email, setEmail] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when closing
  const handleClose = () => {
    setMode("forgot_request");
    setEmail("");
    setVerificationCode("");
    setNewPassword("");
    setConfirmPassword("");
    setShowNewPassword(false);
    setShowConfirmPassword(false);
    setError(null);
    setSuccessMessage(null);
    setIsLoading(false);
    onClose();
  };

  const handleForgotPasswordRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setError("Please enter your registered institutional email.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/forgot-password-request", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to request password reset.");
      }

      setSuccessMessage(data.message);
      setMode("forgot_verify");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !verificationCode || !newPassword || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setError(null);
    setSuccessMessage(null);
    setIsLoading(true);

    try {
      const response = await fetch("/api/reset-password-verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          code: verificationCode,
          newPassword
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      setSuccessMessage(data.message);
      setVerificationCode("");
      setNewPassword("");
      setConfirmPassword("");
      
      // Auto-close after success
      setTimeout(() => {
        handleClose();
      }, 3000);
      
    } catch (err: any) {
      console.error(err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="bg-white border border-slate-200 shadow-xl w-full max-w-md max-h-[90vh] flex flex-col overflow-y-auto"
          >
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 shrink-0">
              <h2 className="font-bold text-sm text-slate-800 uppercase tracking-widest flex items-center gap-2">
                <Key size={16} className="text-[#76DA0D]" />
                Password Recovery
              </h2>
              <button onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                <X size={18} />
              </button>
            </div>
            
            <div className="p-6">
              {/* Messages Header */}
              {error && (
                <div className="mb-4 bg-red-50 text-red-700 p-3 flex items-start gap-3 border border-red-100 text-xs shadow-sm">
                  <AlertCircle size={14} className="mt-0.5 shrink-0" />
                  <p className="font-medium leading-relaxed">{error}</p>
                </div>
              )}

              {successMessage && (
                <div className="mb-4 bg-green-50 text-green-800 p-3 flex items-start gap-3 border border-green-200 text-xs shadow-sm">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0" />
                  <p className="font-medium leading-relaxed">{successMessage}</p>
                </div>
              )}

              {mode === "forgot_request" ? (
                <form id="forgot-password-request-form" onSubmit={handleForgotPasswordRequest} className="space-y-6">
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 border-l-2 border-[#76DA0D]">
                    To reset your passcode, enter your institutional email. A verification code will be sent to confirm your identity.
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
                        placeholder="e.g. j.doe@example.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
                      />
                    </div>
                  </div>

                  <div className="pt-4 flex justify-end">
                    <button
                      type="submit"
                      disabled={isLoading}
                      className="btn-editorial-primary flex items-center justify-center gap-2 cursor-pointer min-w-[180px] text-xs py-2 w-full"
                    >
                      {isLoading ? (
                        <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <span>Send Code</span>
                          <ArrowRight size={12} />
                        </>
                      )}
                    </button>
                  </div>
                </form>
              ) : (
                <form id="forgot-password-verify-form" onSubmit={handleForgotPasswordVerify} className="space-y-6">
                  <p className="text-[11px] text-slate-500 leading-relaxed bg-slate-50 p-3 border-l-2 border-[#76DA0D]">
                    Enter the 6-digit verification code sent to <strong>{email}</strong> and choose a new passcode.
                  </p>

                  {/* Verification Code */}
                  <div className="flex flex-col">
                    <label className="text-[10px] text-[#888] uppercase tracking-widest font-semibold mb-1.5">
                      6-Digit Verification Code
                    </label>
                    <div className="relative">
                      <span className="absolute left-0 top-1/2 -translate-y-1/2 text-slate-400">
                        <ShieldCheck size={15} />
                      </span>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 123456"
                        value={verificationCode}
                        onChange={(e) => setVerificationCode(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-6 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A] tracking-widest font-mono"
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
                        type={showConfirmPassword ? "text" : "password"}
                        required
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        disabled={isLoading}
                        className="w-full pl-6 pr-8 editorial-input text-xs font-sans placeholder-slate-300 text-[#1A1A1A]"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 hover:text-[#76DA0D] transition-colors cursor-pointer"
                      >
                        {showConfirmPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="pt-4 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => setMode("forgot_request")}
                      disabled={isLoading}
                      className="text-[10px] uppercase font-black text-slate-400 tracking-widest hover:text-[#102604] transition-colors inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                    >
                      <ArrowLeft size={12} />
                      <span>Back</span>
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
