/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from "react";
import { LogOut, Settings2, ShieldCheck, Sun, Clock, Calendar, Compass, Clipboard, UserPlus, FileText, Table, BarChart3 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { UserAccount } from "../types";
import AccountSettingsView from "./AccountSettingsView";
import RegisterStudentModal from "./RegisterStudentModal";
import StudentSearchModal from "./StudentSearchModal";
import CICLSearchModal from "./CICLSearchModal";
import DataAnalyticsView from "./DataAnalyticsView";

interface DashboardViewProps {
  user: Partial<UserAccount>;
  onLogout: () => void;
  onUpdateUser: (freshUser: Partial<UserAccount>) => void;
}

export default function DashboardView({ user, onLogout, onUpdateUser }: DashboardViewProps) {
  const [showSettings, setShowSettings] = useState(false);
  const [showRegisterStudent, setShowRegisterStudent] = useState(false);
  const [showStudentSearch, setShowStudentSearch] = useState(false);
  const [showCICLReport, setShowCICLReport] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);

  return (
    <div id="dashboard-layout" className="min-h-screen bg-[#FFFFFF] flex flex-col font-sans text-[#102604]">
      
      {/* Top Navbar */}
      <header id="dashboard-navbar" className="bg-white border-b border-slate-200 px-8 py-4 shrink-0 shadow-xs flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <img 
            src="https://upload.wikimedia.org/wikipedia/commons/thumb/8/88/Ramon_Magsaysay_%28Cubao%29_High_School.svg/500px-Ramon_Magsaysay_%28Cubao%29_High_School.svg.png"
            alt="RMCHS Crest"
            className="w-12 h-12 object-contain rounded-full bg-white p-1 border-2 border-[#FFEA00] shadow-xs"
            referrerPolicy="no-referrer"
          />
          <div>
            <h1 id="navbar-app-title" className="serif font-serif font-bold text-[#102604] tracking-tight text-lg">RMCHS Anecdotal Portal</h1>
            <p className="text-[9px] text-[#888] font-bold font-sans uppercase tracking-widest">Faculty & Staff Sync</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center gap-3">
          <button
            id="register-student-trigger"
            onClick={() => setShowRegisterStudent(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#102604] hover:bg-[#102604]/5 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none"
          >
            <UserPlus size={13} className="text-[#76DA0D]" />
            <span>Register Student</span>
          </button>
          
          <button
            onClick={() => setShowStudentSearch(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#102604] hover:bg-[#102604]/5 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none"
          >
            <FileText size={13} className="text-[#76DA0D]" />
            <span>Report</span>
          </button>

          <button
            onClick={() => setShowCICLReport(true)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#102604] hover:bg-[#102604]/5 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none"
          >
            <FileText size={13} className="text-red-500" />
            <span>Report CICL</span>
          </button>

          <button
            onClick={() => setShowAnalytics(!showAnalytics)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-[#102604] hover:bg-[#102604]/5 hover:border-[#76DA0D] text-[#102604] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none"
          >
            <BarChart3 size={13} className="text-blue-500" />
            <span>Data Analytics</span>
          </button>

          <button
            id="settings-trigger"
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-2 px-4 py-2 border border-[#76DA0D] text-[#102604] hover:bg-[#76DA0D]/10 hover:border-[#FFEA00] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none"
          >
            <Settings2 size={13} className="text-[#76DA0D]" />
            <span>Account Settings</span>
          </button>

          <button
            id="logout-btn"
            onClick={onLogout}
            className="flex items-center gap-2 px-4 py-2 bg-[#76DA0D] hover:bg-[#88F015] text-[#102604] border border-[#FFEA00] font-bold text-[10px] tracking-widest uppercase transition-all cursor-pointer select-none shadow-xs"
          >
            <LogOut size={13} />
            <span>Logout Portal</span>
          </button>
        </div>
      </header>

      {/* Main Workspace Stage */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-8 flex flex-col gap-8">
        
        {/* Right column: Expansive aesthetic blank dashboard placeholder */}
        <div id="dashboard-content-col" className="flex-1">
          {showAnalytics ? (
            <DataAnalyticsView />
          ) : (
            <motion.div
              id="workspace-stage"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.15 }}
              className="bg-white border border-slate-200 rounded-none p-12 shadow-xs min-h-[500px] flex flex-col justify-center items-center text-center relative"
            >
              {/* Elegant decorative background compass */}
              <div className="absolute top-8 left-8 text-left opacity-15 select-none pointer-events-none">
                <Compass size={44} className="text-[#76DA0D]" />
              </div>

              <div className="max-w-md space-y-6">
                <div className="inline-flex items-center justify-center w-16 h-16 bg-[#76DA0D]/10 text-[#102604] rounded-none border border-[#76DA0D]/30 shadow-xs mb-2">
                  <Clipboard size={28} />
                </div>

                <div id="dashboard-message-group" className="space-y-3">
                  <h4 id="workspace-title" className="serif font-serif text-3xl text-slate-900 tracking-tight font-light">
                    Institutional Workspace Initialized
                  </h4>
                  <p id="workspace-description" className="text-xs leading-relaxed text-slate-500 font-sans max-w-sm mx-auto">
                    Welcome to your secure administrative portal workspace. Your credentials have been authenticated successfully via database records. Current workspace modules are active and synced.
                  </p>
                </div>

                {/* Minimal line break spacer */}
                <div className="w-16 h-[1px] bg-slate-200 mx-auto my-4" />

                <div className="pt-2 flex flex-wrap justify-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-none text-[9px] font-bold uppercase tracking-wider font-sans text-slate-500">
                    <ShieldCheck size={12} className="text-slate-600" />
                    <span>Secure SH-256</span>
                  </span>
                  
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200 rounded-none text-[9px] font-bold uppercase tracking-wider font-sans text-slate-500">
                    <Sun size={12} className="text-slate-600 animate-pulse" />
                    <span>Session Active</span>
                  </span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

      </main>

      {/* Account Settings Overlay */}
      <AnimatePresence>
        {showSettings && (
          <AccountSettingsView
            user={user}
            onClose={() => setShowSettings(false)}
            onUpdateSuccess={(freshUser) => {
              onUpdateUser(freshUser);
            }}
          />
        )}
      </AnimatePresence>

      {/* Register Student Overlay */}
      <AnimatePresence>
        {showRegisterStudent && (
          <RegisterStudentModal
            registeredByEmail={user.email || ""}
            onClose={() => setShowRegisterStudent(false)}
          />
        )}
      </AnimatePresence>
      
      {/* Student Search Overlay */}
      <AnimatePresence>
        {showStudentSearch && (
          <StudentSearchModal
            userName={`${user.firstName} ${user.lastName}`}
            onClose={() => setShowStudentSearch(false)}
          />
        )}
      </AnimatePresence>
      
      {/* CICL Report Overlay */}
      <AnimatePresence>
        {showCICLReport && (
          <CICLSearchModal
            userName={`${user.firstName} ${user.lastName}`}
            onClose={() => setShowCICLReport(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
