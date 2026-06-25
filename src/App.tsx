/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { AnimatePresence, motion } from "motion/react";
import { UserAccount } from "./types";
import DBStatus from "./components/DBStatus";
import LoginView from "./components/LoginView";
import RegisterView from "./components/RegisterView";
import DashboardView from "./components/DashboardView";
import { GraduationCap } from "lucide-react";

export default function App() {
  const [currentUser, setCurrentUser] = useState<Partial<UserAccount> | null>(null);
  const [viewState, setViewState] = useState<"login" | "register" | "dashboard">("login");
  const [isInitializing, setIsInitializing] = useState(true);

  // Initialize auth state from local storage on browser render
  useEffect(() => {
    try {
      const cached = localStorage.getItem("teacher_portal_user");
      if (cached) {
        const parsed = JSON.parse(cached);
        setCurrentUser(parsed);
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
    localStorage.setItem("teacher_portal_user", JSON.stringify(user));
    setViewState("dashboard");
  };

  const handleRegisterSuccess = (user: Partial<UserAccount>) => {
    // When registration completes, automatically log them in for flawless user journey
    setCurrentUser(user);
    localStorage.setItem("teacher_portal_user", JSON.stringify(user));
    setViewState("dashboard");
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem("teacher_portal_user");
    setViewState("login");
  };

  const handleUpdateUser = (freshUser: Partial<UserAccount>) => {
    // Merge new attributes
    const merged = { ...currentUser, ...freshUser };
    setCurrentUser(merged);
    localStorage.setItem("teacher_portal_user", JSON.stringify(merged));
  };

  if (isInitializing) {
    return (
      <div id="init-loader" className="min-h-screen bg-[#FFFFFF] flex flex-col justify-center items-center">
        <div className="w-10 h-[1px] bg-[#76DA0D] animate-pulse mb-4" />
        <p className="serif italic text-[#102604] text-lg select-none">Retrieving Registry...</p>
        <p className="text-[10px] uppercase tracking-widest text-slate-400 font-mono mt-1 animate-pulse">Handshaking securely</p>
      </div>
    );
  }

  // Dashboard has its own navbar & immersive custom canvas layout, so we render it standalone
  if (viewState === "dashboard" && currentUser) {
    return (
      <DashboardView
        user={currentUser}
        onLogout={handleLogout}
        onUpdateUser={handleUpdateUser}
      />
    );
  }

  return (
    <div id="landing-layout" className="min-h-screen bg-[#FFFFFF] text-[#102604] font-sans flex flex-col md:flex-row relative overflow-x-hidden selection:bg-[#76DA0D]/20">
      
      {/* Floating Database Sync status indicator - repositioned elegantly for Editorial */}
      <div className="absolute top-4 right-4 z-50">
        <DBStatus />
      </div>

      {/* LEFT COLUMN: Deep Editorial Slate Header Area ({1/3} Width on modern layout) */}
      <div className="w-full md:w-1/3 bg-[#76DA0D] p-8 md:p-12 lg:p-16 flex flex-col justify-between text-[#102604] relative shrink-0">
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
              <p className="font-serif text-lg leading-tight font-bold text-[#102604]">RMCHS</p>
              <p className="text-[9px] uppercase tracking-widest text-[#102604]/80 font-mono font-bold">Anecdotal Portal</p>
            </div>
          </div>
          
          {/* Decorative hairline */}
          <div className="w-12 h-[1px] bg-[#102604] opacity-35"></div>
          
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/60 border border-[#102604]/10 rounded-full text-[#102604] font-semibold text-[10px] tracking-wider uppercase font-sans">
              <GraduationCap size={13} className="text-[#102604]" />
              <span>Institutional Core v2.0</span>
            </div>
            <h1 className="font-serif serif text-4xl md:text-5xl leading-tight font-light text-[#102604]">
              Anecdotal<br />
              <span className="italic block mt-1 font-bold">Registry</span>
            </h1>
          </div>
          
          <p className="text-[#102604]/80 text-xs md:text-sm leading-relaxed max-w-[240px] font-sans font-medium">
            Unified administrative portal for secure professional profiles, institutional anecdote management, and staff records database synchronization.
          </p>
        </div>

        <div className="space-y-6 mt-8 md:mt-0">


          <div className="pt-4 border-t border-[#102604]/20 flex items-center justify-between">
            <div>
              <span className="font-serif serif italic text-2xl tracking-tighter text-[#102604] font-bold">2026</span>
              <span className="block text-[9px] uppercase tracking-widest text-[#102604]/60 font-bold">Academic Year</span>
            </div>
            <div className="text-right">
              <span className="text-[9px] uppercase tracking-widest text-[#102604]/50 font-mono font-bold block">District 58</span>
              <span className="text-[9px] uppercase tracking-widest text-[#102604]/60 font-mono font-bold block">Node Live</span>
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
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="w-full"
              >
                <LoginView
                  onLoginSuccess={handleLoginSuccess}
                  onNavigateToRegister={() => setViewState("register")}
                />
              </motion.div>
            )}

            {viewState === "register" && (
              <motion.div
                key="view-register"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
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
  );
}
