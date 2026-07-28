/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserAccount } from "./types";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import DashboardView from "./components/DashboardView";
import { NotificationProvider } from "./components/NotificationProvider";
import { SessionTimeoutHandler } from "./components/SessionTimeoutHandler";
import { GraduationCap } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Partial<UserAccount> | null>(null);
  const [viewState, setViewState] = useState<"login" | "register" | "dashboard">("login");
  const [isInitializing, setIsInitializing] = useState(true);
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [sessionTimeoutMinutes, setSessionTimeoutMinutes] = useState<number>(() => {
    const saved = localStorage.getItem("teacher_portal_session_timeout");
    return saved !== null ? parseInt(saved, 10) : 15;
  });

  // Sync session timeout settings if updated in localStorage
  useEffect(() => {
    const updateTimeoutConfig = () => {
      const saved = localStorage.getItem("teacher_portal_session_timeout");
      const parsed = saved !== null ? parseInt(saved, 10) : 15;
      if (!isNaN(parsed)) {
        setSessionTimeoutMinutes(parsed);
      }
    };

    window.addEventListener("storage", updateTimeoutConfig);
    return () => window.removeEventListener("storage", updateTimeoutConfig);
  }, []);

  // Initialize auth state from local storage on browser render
  useEffect(() => {
    try {
      const logoutReason = localStorage.getItem("teacher_portal_logout_reason");
      if (logoutReason) {
        setSessionNotice(logoutReason);
        localStorage.removeItem("teacher_portal_logout_reason");
      }

      const cached = localStorage.getItem("teacher_portal_user");
      const lastActivity = localStorage.getItem("teacher_portal_last_activity");
      const savedTimeout = localStorage.getItem("teacher_portal_session_timeout");
      const timeoutMins = savedTimeout !== null ? parseInt(savedTimeout, 10) : 15;

      if (cached) {
        const parsedUser = JSON.parse(cached);
        // Check if existing session already expired before app loaded
        if (timeoutMins > 0 && lastActivity) {
          const lastActivityTime = parseInt(lastActivity, 10);
          const elapsed = Date.now() - lastActivityTime;
          if (elapsed > timeoutMins * 60 * 1000) {
            localStorage.removeItem("teacher_portal_user");
            setCurrentUser(null);
            setViewState("login");
            setSessionNotice("Your previous session expired due to inactivity. Please log in again.");
            return;
          }
        }
        setCurrentUser(parsedUser);
        setViewState("dashboard");
      }
    } catch (err) {
      console.error("Local user profile loading failed:", err);
    } finally {
      setIsInitializing(false);
    }
  }, []);

  const handleLoginSuccess = (user: Partial<UserAccount>) => {
    setCurrentUser(user);
    setSessionNotice(null);
    localStorage.setItem("teacher_portal_user", JSON.stringify(user));
    localStorage.setItem("teacher_portal_last_activity", Date.now().toString());
    setViewState("dashboard");
  };

  const handleRegisterSuccess = (user: Partial<UserAccount>) => {
    // When registration completes, automatically log them in for flawless user journey
    setCurrentUser(user);
    setSessionNotice(null);
    localStorage.setItem("teacher_portal_user", JSON.stringify(user));
    localStorage.setItem("teacher_portal_last_activity", Date.now().toString());
    setViewState("dashboard");
  };

  const handleLogout = useCallback((reason?: string) => {
    localStorage.removeItem("teacher_portal_user");
    localStorage.removeItem("teacher_portal_last_activity");
    if (reason) {
      localStorage.setItem("teacher_portal_logout_reason", reason);
    }
    window.location.reload();
  }, []);

  const handleUpdateUser = (freshUser: Partial<UserAccount>) => {
    // Merge new attributes
    const merged = { ...currentUser, ...freshUser };
    setCurrentUser(merged);
    localStorage.setItem("teacher_portal_user", JSON.stringify(merged));
  };

  if (isInitializing) {
    return (
      <NotificationProvider>
        <div id="init-loader" className="min-h-screen bg-[#FFFFFF] flex flex-col justify-center items-center">
          <div className="w-10 h-[1px] bg-[#76DA0D] animate-pulse mb-4" />
          <p className="serif italic text-[#102604] text-lg select-none">Retrieving Registry...</p>
          <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono mt-1 animate-pulse">Handshaking securely</p>
        </div>
      </NotificationProvider>
    );
  }

  // Dashboard has its own navbar & immersive custom canvas layout, so we render it standalone
  if (viewState === "dashboard" && currentUser) {
    return (
      <NotificationProvider>
        <SessionTimeoutHandler
          user={currentUser}
          onLogout={handleLogout}
          timeoutMinutes={sessionTimeoutMinutes}
        />
        <DashboardView
          user={currentUser}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
        />
      </NotificationProvider>
    );
  }

  // Animation variants for cascading entrance
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] } }
  };

  return (
    <NotificationProvider>
      <div 
        id="landing-layout" 
        className="min-h-screen bg-[#FFFFFF] text-[#102604] font-sans flex flex-col md:flex-row relative overflow-x-hidden selection:bg-[#76DA0D]/20"
      >
      
      {/* LEFT COLUMN: Deep Editorial Slate Header Area ({1/3} Width on modern layout) */}
      <div className="w-full md:w-1/3 bg-[#102604] p-8 md:p-12 lg:p-16 flex flex-col justify-between text-white relative shrink-0">
        <div className="space-y-8 mt-4 md:mt-12">
          {/* Logo element for RMCHS */}
          <div className="flex items-center gap-4">
            <img 
              src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ramon_Magsaysay_%28Cubao%29_High_School.svg/500px-Ramon_Magsaysay_%28Cubao%29_High_School.svg.png" 
              alt="RMCHS logo" 
              className="w-16 h-16 object-contain bg-white p-1 rounded-full border-2 border-[#FFEA00] shadow-md shrink-0"
              referrerPolicy="no-referrer"
            />
            <div>
              <p className="font-serif text-lg leading-tight font-bold text-white">RMCHS</p>
              <p className="text-[9px] uppercase tracking-widest text-[#76DA0D] font-mono font-bold">Project C.A.R.E.</p>
            </div>
          </div>
          
          {/* Decorative hairline */}
          <div className="w-12 h-[1px] bg-white opacity-20"></div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 border border-white/20 rounded-full text-white font-semibold text-[10px] tracking-wider uppercase font-sans">
              <GraduationCap size={13} className="text-[#76DA0D]" />
              <span>Institutional Core v2.0</span>
            </div>
            <h1 className="font-serif serif text-4xl md:text-5xl leading-tight font-light text-white">
              Project<br />
              <span className="italic block mt-1 font-bold">C.A.R.E.</span>
            </h1>
          </div>
          
          <div>
            <p className="text-white/80 text-xs md:text-sm leading-relaxed max-w-[240px] font-sans font-medium">
              Counseling & Academic Records Engagement. A secure administrative platform for managing professional profiles and facilitating institutional student support.
            </p>
          </div>
        </div>
        <div className="space-y-6 mt-8 md:mt-0">
          <div className="pt-4 border-t border-white/20 flex items-center justify-between">
            <div>
              <span className="font-serif serif italic text-2xl tracking-tighter text-[#76DA0D] font-bold">2026</span>
              <span className="block text-[9px] uppercase tracking-widest text-white/60 font-bold">Academic Year</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-white/50 font-mono font-bold block">District 58</span>
              <span className="text-[9px] uppercase tracking-widest text-[#76DA0D] font-mono font-bold block">Node Live</span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT COLUMN: Interactive Registration / Login Form Stage ({2/3} Width on modern layout) */}
      <div className="w-full md:w-2/3 p-6 md:p-12 lg:p-16 flex flex-col justify-between bg-[#FFFFFF] min-h-screen">
        
        {/* Flex container wrapper for centering */}
        <div className="flex-1 flex flex-col justify-center max-w-xl w-full mx-auto py-8">
          
          {/* Subtle Background raw line decorations */}
          <div className="hidden lg:block absolute top-[10%] right-[10%] w-32 h-[1px] bg-slate-200/50 pointer-events-none" />
          <div className="hidden lg:block absolute bottom-[10%] right-[15%] w-[1px] h-32 bg-slate-200/50 pointer-events-none" />

          {/* View Switch Stage */}
          <AnimatePresence mode="wait">
            {viewState === "login" && (
              <motion.div
                key="view-login"
                initial={{ opacity: 0, x: -28, filter: "blur(3px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: 28, filter: "blur(3px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <LoginView
                  onLoginSuccess={handleLoginSuccess}
                  onNavigateToRegister={() => setViewState("register")}
                  sessionNotice={sessionNotice}
                />
              </motion.div>
            )}

            {viewState === "register" && (
              <motion.div
                key="view-register"
                initial={{ opacity: 0, x: 28, filter: "blur(3px)" }}
                animate={{ opacity: 1, x: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, x: -28, filter: "blur(3px)" }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
                className="w-full"
              >
                <RegisterView
                  onRegisterSuccess={handleRegisterSuccess}
                  onNavigateToLogin={() => setViewState("login")}
                />
              </motion.div>
            )}
          </AnimatePresence>

        </div>

        {/* Footer credits bar compliant with Editorial Design blueprint */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row justify-between text-[10px] text-slate-400 uppercase tracking-widest font-mono gap-2 shrink-0">
          <div>Internal Systems Security • SHA-256 Encrypted</div>
          <div>v2.0.4-Stable</div>
        </div>

      </div>
    </div>
    </NotificationProvider>
  );
}
