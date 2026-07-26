import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { ShieldAlert, Clock, LogOut, CheckCircle2 } from "lucide-react";
import { UserAccount } from "../types";
import { useSessionTimeout } from "../hooks/useSessionTimeout";

interface SessionTimeoutHandlerProps {
  user: Partial<UserAccount> | null;
  onLogout: (reason?: string) => void;
  timeoutMinutes: number; // e.g. 15
}

export const SessionTimeoutHandler: React.FC<SessionTimeoutHandlerProps> = ({
  user,
  onLogout,
  timeoutMinutes
}) => {
  const { showWarning, secondsRemaining, extendSession } = useSessionTimeout({
    user,
    onLogout,
    timeoutMinutes,
  });

  if (!user || !showWarning || timeoutMinutes <= 0) {
    return null;
  }

  // Calculate percentage for countdown bar
  const totalWarningWindow = Math.min(120, timeoutMinutes * 30);
  const percentRemaining = Math.min(100, Math.max(0, (secondsRemaining / totalWarningWindow) * 100));

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-4">
        <motion.div
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
          className="w-full max-w-md bg-white border border-amber-300 shadow-2xl overflow-hidden rounded-none p-6 text-slate-900"
        >
          {/* Header */}
          <div className="flex items-start gap-4 mb-4">
            <div className="w-12 h-12 bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 border border-amber-200">
              <ShieldAlert size={28} />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-amber-700 tracking-widest font-mono block">
                Session Timeout Warning
              </span>
              <h3 className="text-lg font-serif font-bold text-slate-900 leading-snug">
                Are you still working?
              </h3>
            </div>
          </div>

          <p className="text-xs text-slate-600 mb-6 leading-relaxed">
            Due to inactivity, your session will automatically expire in:
          </p>

          {/* Countdown Display */}
          <div className="bg-amber-50 border border-amber-200 p-4 mb-6 text-center">
            <div className="flex items-center justify-center gap-2 mb-2">
              <Clock size={20} className="text-amber-600 animate-pulse" />
              <span className="text-3xl font-black font-mono text-amber-900 tracking-tight">
                {secondsRemaining}s
              </span>
            </div>
            {/* Progress Bar */}
            <div className="w-full bg-amber-200/60 h-2 overflow-hidden">
              <div
                className="bg-amber-600 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${percentRemaining}%` }}
              />
            </div>
            <p className="text-[10px] text-amber-700 mt-2 uppercase font-mono tracking-wider">
              Click &quot;Stay Logged In&quot; to continue your session
            </p>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
            <button
              onClick={() => onLogout("Logged out manually from session timeout prompt.")}
              className="flex items-center gap-1.5 px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wider transition-colors cursor-pointer"
            >
              <LogOut size={14} />
              <span>Log Out</span>
            </button>
            <button
              onClick={extendSession}
              className="flex items-center gap-1.5 px-5 py-2 bg-[#102604] hover:bg-[#1a3a06] text-white text-xs font-bold uppercase tracking-wider transition-colors shadow-md cursor-pointer"
            >
              <CheckCircle2 size={14} className="text-[#76DA0D]" />
              <span>Stay Logged In</span>
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

