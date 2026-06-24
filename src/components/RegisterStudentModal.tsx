/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Download, UploadCloud, CheckCircle2, AlertTriangle, User, Users, Home, BookOpen, Check, ArrowRight, ArrowLeft } from "lucide-react";
import { Student } from "../types";

interface RegisterStudentModalProps {
  onClose: () => void;
  registeredByEmail: string;
}

const NCR_CITIES = [
  "Caloocan",
  "Las Piñas",
  "Makati",
  "Malabon",
  "Mandaluyong",
  "Manila",
  "Marikina",
  "Muntinlupa",
  "Navotas",
  "Parañaque",
  "Pasay",
  "Pasig",
  "Quezon City",
  "San Juan",
  "Taguig",
  "Valenzuela",
  "Pateros"
];

const INITIAL_FORM_STATE: Omit<Student, "registeredAt" | "registeredBy"> = {
  lrn: "",
  lastName: "",
  firstName: "",
  middleName: "",
  gradeLevel: "Grade 7",
  section: "",
  gender: "Male",
  dateOfBirth: "",
  heightCm: 0,
  weightKg: 0,
  religion: "Catholic",
  religionSpecify: "",
  is4ps: "No",
  isIndigenous: "No",
  fatherName: "",
  fatherContact: "",
  fatherIncome: "",
  motherName: "",
  motherContact: "",
  motherIncome: "",
  guardianName: "",
  guardianRelationship: "",
  guardianContact: "",
  guardianIncome: "",
  siblingsCount: 0,
  siblingsBelow18: 0,
  ordinalOrder: "1st",
  houseNumber: "",
  street: "",
  barangay: "",
  city: "Quezon City",
  learningModality: "Face-to-Face",
  internetConnectivity: "None",
};

const CSV_HEADER_COLUMNS = [
  "lrn", "lastName", "firstName", "middleName", "gradeLevel", "section", "gender", "dateOfBirth",
  "heightCm", "weightKg", "religion", "religionSpecify", "is4ps", "isIndigenous",
  "fatherName", "fatherContact", "fatherIncome", "motherName", "motherContact", "motherIncome",
  "guardianName", "guardianRelationship", "guardianContact", "guardianIncome",
  "siblingsCount", "siblingsBelow18", "ordinalOrder", "houseNumber", "street", "barangay", "city",
  "learningModality", "internetConnectivity"
];

const CSV_TEMPLATE_CONTENT = `${CSV_HEADER_COLUMNS.join(",")}
123456789012,Dela Cruz,Juan,Mercado,Grade 7,Section A,Male,2013-10-24,152,42,Catholic,,No,No,Ramon Dela Cruz,09171234567,20000,Maria Dela Cruz,09187654321,18000,Maria Dela Cruz,Mother,09187654321,18000,2,1,1st,45,Magsaysay Boulevard,Barangay 58,Quezon City,Face-to-Face,Fiber broadband internet (wifi)
123456789013,Santos,Maria,Gomez,Grade 8,Section B,Female,2012-04-12,148,39,Muslim,,Yes,No,Jose Santos,09151234567,15000,Ana Santos,09161234567,12000,,,09161234567,12000,3,2,2nd,12,Rizal St,Barangay 2,Manila,Modular (print),Mobile Data`;

export default function RegisterStudentModal({ onClose, registeredByEmail }: RegisterStudentModalProps) {
  const [method, setMethod] = useState<"individual" | "bulk">("individual");
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(INITIAL_FORM_STATE);
  const [sections, setSections] = useState<string[]>([]);
  
  useEffect(() => {
    if (form.gradeLevel) {
      fetch(`/api/sections?gradeLevel=${encodeURIComponent(form.gradeLevel)}`)
        .then(res => res.json())
        .then(data => setSections(Array.from(new Set(data))))
        .catch(console.error);
    }
  }, [form.gradeLevel]);
  
  // File upload / CSV states
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [isDragOver, setIsDragOver] = useState(false);
  const [csvError, setCsvError] = useState("");

  // Loading/submission states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitMessage, setSubmitMessage] = useState("");
  const [submitErrors, setSubmitErrors] = useState<string[]>([]);
  const [validationError, setValidationError] = useState("");
  const [dbStatus, setDbStatus] = useState<{ configured: boolean; error: string | null } | null>(null);
  const [contactType, setContactType] = useState<"father" | "mother" | "guardian">("father");

  React.useEffect(() => {
    fetch("/api/db-status")
      .then(res => {
        if (res.ok) return res.json();
        throw new Error("Failed to fetch database status");
      })
      .then(data => setDbStatus(data))
      .catch(err => console.error("Failed to query database status inside modal:", err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    const num = value === "" ? 0 : parseFloat(value);
    setForm(prev => ({
      ...prev,
      [name]: isNaN(num) ? 0 : num
    }));
  };

  const validateStep = () => {
    setValidationError("");
    if (step === 1) {
      if (!form.lrn.trim() || !form.lastName.trim() || !form.firstName.trim()) {
        setValidationError("LRN, Last Name, and First Name are required.");
        return false;
      }
      if (!/^\d{12}$/.test(form.lrn.trim())) {
        setValidationError("LRN must be exactly 12 numerical digits.");
        return false;
      }
      if (!form.section.trim()) {
        setValidationError("Section is required.");
        return false;
      }
      if (!form.dateOfBirth) {
        setValidationError("Date of Birth is required.");
        return false;
      }
      if (form.heightCm <= 0 || form.weightKg <= 0) {
        setValidationError("Height and Weight must be positive values.");
        return false;
      }
    } else if (step === 2) {
      if (contactType === "father") {
        if (!form.fatherName.trim()) {
          setValidationError("Father's Name is required.");
          return false;
        }
        if (form.fatherContact.trim() && !/^\+?\d+$/.test(form.fatherContact.trim())) {
          setValidationError("Father's contact number must contain digits only.");
          return false;
        }
      } else if (contactType === "mother") {
        if (!form.motherName.trim()) {
          setValidationError("Mother's Name is required.");
          return false;
        }
        if (form.motherContact.trim() && !/^\+?\d+$/.test(form.motherContact.trim())) {
          setValidationError("Mother's contact number must contain digits only.");
          return false;
        }
      } else if (contactType === "guardian") {
        if (!form.guardianName.trim()) {
          setValidationError("Guardian's Name is required.");
          return false;
        }
        if (!form.guardianRelationship.trim()) {
          setValidationError("Please specify the Guardian's relationship to the student.");
          return false;
        }
        if (form.guardianContact.trim() && !/^\+?\d+$/.test(form.guardianContact.trim())) {
          setValidationError("Guardian's contact number must contain digits only.");
          return false;
        }
      }
    } else if (step === 3) {
      if (!form.barangay.trim() || !form.street.trim()) {
        setValidationError("Street and Barangay are required.");
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep()) {
      setStep(prev => prev + 1);
    }
  };

  const handlePrev = () => {
    setValidationError("");
    setStep(prev => prev - 1);
  };

  const handleIndividualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep()) return;

    setIsSubmitting(true);
    setValidationError("");
    setSubmitErrors([]);

    const finalForm = { ...form };
    if (contactType !== "father") {
      finalForm.fatherName = "";
      finalForm.fatherContact = "";
      finalForm.fatherIncome = "";
    }
    if (contactType !== "mother") {
      finalForm.motherName = "";
      finalForm.motherContact = "";
      finalForm.motherIncome = "";
    }
    if (contactType !== "guardian") {
      finalForm.guardianName = "";
      finalForm.guardianRelationship = "";
      finalForm.guardianContact = "";
      finalForm.guardianIncome = "";
    }

    const payload: Student = {
      ...finalForm,
      registeredAt: new Date().toISOString(),
      registeredBy: registeredByEmail,
    };

    try {
      const response = await fetch("/api/students/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to register student");
      }

      setSubmitSuccess(true);
      setSubmitMessage("Student has been registered successfully!");
      // Reset form
      setForm(INITIAL_FORM_STATE);
      setStep(1);
    } catch (err: any) {
      setValidationError(err.message || "An unexpected error occurred during registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // CSV Parsing
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = [];
    let current = "";
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    result.push(current.trim());
    return result;
  };

  const handleCsvFileLoad = (file: File) => {
    setCsvError("");
    setCsvFile(file);
    
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const lines = text.split(/\r?\n/);
        if (lines.length < 2) {
          throw new Error("CSV file must contain at least headers and one student row.");
        }

        const headers = parseCSVLine(lines[0]);
        // Validate headers map the fields properly
        const invalidHeaders = CSV_HEADER_COLUMNS.filter(col => !headers.includes(col));
        if (invalidHeaders.length > 5) { // allow some mismatch but flag major issues
          throw new Error("CSV headers mismatch. Please download and use our official starter template.");
        }

        const studentsList: any[] = [];
        for (let i = 1; i < lines.length; i++) {
          const line = lines[i].trim();
          if (!line) continue;
          
          const values = parseCSVLine(line);
          const studentRow: any = {};
          
          headers.forEach((header, idx) => {
            const val = values[idx] || "";
            // map clean header fields
            if (CSV_HEADER_COLUMNS.includes(header)) {
              if (header === "heightCm" || header === "weightKg" || header === "siblingsCount" || header === "siblingsBelow18") {
                studentRow[header] = Number(val) || 0;
              } else {
                studentRow[header] = val;
              }
            }
          });

          // basic row validation
          if (studentRow.lrn && studentRow.lastName && studentRow.firstName) {
            studentsList.push(studentRow);
          }
        }

        if (studentsList.length === 0) {
          throw new Error("No valid student records found. Check if LRN, LastName, and FirstName are supplied.");
        }

        setCsvPreview(studentsList);
      } catch (err: any) {
        setCsvError(err.message || "Failed to parse CSV file.");
        setCsvPreview([]);
        setCsvFile(null);
      }
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleCsvFileLoad(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelectChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleCsvFileLoad(e.target.files[0]);
    }
  };

  const handleBulkSubmit = async () => {
    if (csvPreview.length === 0) return;

    setIsSubmitting(true);
    setValidationError("");
    setSubmitErrors([]);

    const studentsWithMetadata = csvPreview.map(student => ({
      ...student,
      registeredAt: new Date().toISOString(),
      registeredBy: registeredByEmail
    }));

    try {
      const response = await fetch("/api/students/bulk-register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ students: studentsWithMetadata }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to bulk register students");
      }

      setSubmitSuccess(true);
      setSubmitMessage(data.message);
      if (data.errors && data.errors.length > 0) {
        setSubmitErrors(data.errors);
      }
      setCsvPreview([]);
      setCsvFile(null);
    } catch (err: any) {
      setValidationError(err.message || "An unexpected error occurred during bulk registration.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "student_registration_template.csv");
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div id="register-student-backdrop" className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans overflow-hidden">
      <motion.div
        id="register-student-modal"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="bg-white border border-slate-300 w-full max-w-4xl shadow-2xl relative my-8 flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="bg-[#76DA0D] px-6 py-4 flex justify-between items-center border-b border-[#FFEA00] shrink-0">
          <div className="flex items-center gap-3">
            <Users size={20} className="text-[#102604]" />
            <div>
              <h2 className="font-serif text-lg font-bold text-[#102604] tracking-tight">Register Student Hub</h2>
              <p className="text-[9px] text-[#102604]/80 uppercase tracking-widest font-mono font-bold">Ramon Magsaysay High School Registry</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#102604] hover:bg-white/20 p-1.5 rounded-full transition-all cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-200 shrink-0">
          <button
            onClick={() => {
              if (!isSubmitting) {
                setMethod("individual");
                setValidationError("");
              }
            }}
            className={`flex-1 py-3 px-4 text-center font-bold text-xs uppercase tracking-widest transition-all cursor-pointer border-r border-slate-100 ${
              method === "individual"
                ? "bg-[#76DA0D]/5 text-[#102604] border-b-2 border-b-[#76DA0D]"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            Individual Registration Form
          </button>
          <button
            onClick={() => {
              if (!isSubmitting) {
                setMethod("bulk");
                setValidationError("");
              }
            }}
            className={`flex-1 py-3 px-4 text-center font-bold text-xs uppercase tracking-widest transition-all cursor-pointer ${
              method === "bulk"
                ? "bg-[#76DA0D]/5 text-[#102604] border-b-2 border-b-[#76DA0D]"
                : "text-slate-400 hover:bg-slate-50 hover:text-slate-700"
            }`}
          >
            Bulk CSV Upload
          </button>
        </div>

        {/* DB Connection Status Banner */}
        <div className="px-6 py-2 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row justify-between items-start sm:items-center text-[10px] text-slate-500 shrink-0 gap-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-semibold text-slate-600">Database Destination:</span>
            {dbStatus ? (
              dbStatus.configured && !dbStatus.error ? (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold uppercase tracking-wider font-mono text-[8px] rounded-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
                  Supabase Live Connection Active
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 font-bold uppercase tracking-wider font-mono text-[8px] rounded-xs">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Local Cache (Sync Pending - Link Supabase via top-right panel)
                </span>
              )
            ) : (
              <span className="animate-pulse">Determining storage node destination...</span>
            )}
          </div>
          <div className="text-slate-400 font-mono text-[8px] uppercase tracking-wider">
            {dbStatus?.configured && !dbStatus?.error ? "Cloud SQL database replication is online" : "Writing to local file backup"}
          </div>
        </div>

        {/* Full-width Stepper progress bar */}
        {method === "individual" && !submitSuccess && (
          <div className="w-full h-1 bg-slate-100 shrink-0 relative overflow-hidden">
            <motion.div 
              className="absolute left-0 top-0 bottom-0 bg-[#76DA0D]"
              initial={{ width: "25%" }}
              animate={{ width: `${step * 25}%` }}
              transition={{ duration: 0.35, ease: "easeInOut" }}
            />
          </div>
        )}

        {/* Content Stages */}
        <div className="flex-1 overflow-y-auto p-6 min-h-0">
          {submitSuccess ? (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center py-12 max-w-md mx-auto space-y-6"
            >
              <div className="inline-flex items-center justify-center w-16 h-16 bg-[#76DA0D]/10 text-[#76DA0D] rounded-full">
                <CheckCircle2 size={40} className="stroke-[2.5]" />
              </div>
              <div className="space-y-2">
                <h3 className="font-serif text-2xl font-bold text-[#102604]">Registration Completed</h3>
                <p className="text-xs text-slate-500 leading-relaxed">{submitMessage}</p>
              </div>

              {submitErrors.length > 0 && (
                <div className="bg-red-50 border border-red-200 p-4 text-left max-h-40 overflow-y-auto rounded-none">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-red-800 block mb-1">Encountered Registry Errors ({submitErrors.length})</span>
                  <ul className="list-disc list-inside text-[9px] text-red-700 font-mono space-y-0.5">
                    {submitErrors.map((err, i) => <li key={i}>{err}</li>)}
                  </ul>
                </div>
              )}

              <div className="pt-2">
                <button
                  onClick={() => {
                    setSubmitSuccess(false);
                    setSubmitErrors([]);
                    setStep(1);
                  }}
                  className="px-6 py-2 bg-[#76DA0D] text-[#102604] font-bold text-xs uppercase tracking-widest border border-[#FFEA00] hover:bg-[#88F015] transition-all cursor-pointer"
                >
                  Register Another Student
                </button>
              </div>
            </motion.div>
          ) : (
            <>
              {validationError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-start gap-2">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                  <span className="font-medium">{validationError}</span>
                </div>
              )}

              {/* INDIVIDUAL REGISTRATION MULTI-STEP */}
              {method === "individual" && (
                <form onSubmit={handleIndividualSubmit} className="space-y-6">
                  {/* Step Progress Indicators */}
                  <div className="flex items-center justify-between mb-8 max-w-md mx-auto">
                    {[1, 2, 3, 4].map((s) => (
                      <React.Fragment key={s}>
                        <div className="flex items-center">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-[10px] border transition-all ${
                              step === s
                                ? "bg-[#102604] border-[#102604] text-white"
                                : step > s
                                ? "bg-[#76DA0D] border-[#76DA0D] text-[#102604]"
                                : "bg-slate-50 border-slate-300 text-slate-400"
                            }`}
                          >
                            {step > s ? <Check size={11} className="stroke-[3]" /> : s}
                          </div>
                          <span
                            className={`ml-2 text-[10px] font-bold uppercase tracking-wider hidden sm:inline ${
                              step === s ? "text-[#102604]" : "text-slate-400"
                            }`}
                          >
                            {s === 1 ? "Student" : s === 2 ? "Family" : s === 3 ? "House" : "Modality"}
                          </span>
                        </div>
                        {s < 4 && <div className={`flex-1 h-[1px] mx-2 ${step > s ? "bg-[#76DA0D]" : "bg-slate-200"}`} />}
                      </React.Fragment>
                    ))}
                  </div>

                  {/* STEP 1: PERSONAL & PHYSICAL ATTRIBUTES */}
                  {step === 1 && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                        <User size={14} className="text-[#76DA0D]" />
                        <h4 className="font-serif text-sm font-bold text-[#102604]">1. Student Demographics & Attributes</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Last Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="lastName"
                            value={form.lastName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Dela Cruz"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">First Name <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="firstName"
                            value={form.firstName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Juan"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Middle Name</label>
                          <input
                            type="text"
                            name="middleName"
                            value={form.middleName}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Mercado"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Learner Reference Number (LRN) <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="lrn"
                            maxLength={12}
                            value={form.lrn}
                            onChange={(e) => {
                              const val = e.target.value.replace(/\D/g, "");
                              setForm(prev => ({ ...prev, lrn: val }));
                            }}
                            className="w-full px-3 py-2 border border-slate-300 text-xs font-mono focus:outline-none focus:border-[#76DA0D]"
                            placeholder="12-digit numeric code"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Grade Level <span className="text-red-500">*</span></label>
                          <select
                            name="gradeLevel"
                            value={form.gradeLevel}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                          >
                            <option value="Grade 7">Grade 7</option>
                            <option value="Grade 8">Grade 8</option>
                            <option value="Grade 9">Grade 9</option>
                            <option value="Grade 10">Grade 10</option>
                            <option value="Grade 11">Grade 11</option>
                            <option value="Grade 12">Grade 12</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Section <span className="text-red-500">*</span></label>
                          <select
                            name="section"
                            value={form.section}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                            required
                          >
                            <option value="">Select Section</option>
                            {sections.map((section, index) => (
                              <option key={`${section}-${index}`} value={section}>{section}</option>
                            ))}
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Gender <span className="text-red-500">*</span></label>
                          <select
                            name="gender"
                            value={form.gender}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                          >
                            <option value="Male">Male</option>
                            <option value="Female">Female</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Date of Birth <span className="text-red-500">*</span></label>
                          <input
                            type="date"
                            name="dateOfBirth"
                            value={form.dateOfBirth}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            required
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Height (cm) <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              name="heightCm"
                              min={0}
                              value={form.heightCm || ""}
                              onChange={handleNumberChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                              placeholder="cm"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Weight (kg) <span className="text-red-500">*</span></label>
                            <input
                              type="number"
                              name="weightKg"
                              min={0}
                              value={form.weightKg || ""}
                              onChange={handleNumberChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                              placeholder="kg"
                              required
                            />
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Religion</label>
                          <select
                            name="religion"
                            value={form.religion}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                          >
                            <option value="Catholic">Roman Catholic</option>
                            <option value="Muslim">Islam / Muslim</option>
                            <option value="INC">Iglesia Ni Cristo (INC)</option>
                            <option value="Others">Others (Please Specify)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Specify Religion (if others)</label>
                          <input
                            type="text"
                            name="religionSpecify"
                            value={form.religionSpecify}
                            onChange={handleChange}
                            disabled={form.religion !== "Others"}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] disabled:bg-slate-100 disabled:text-slate-400"
                            placeholder="Specify religion"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Member of 4Ps?</label>
                            <select
                              name="is4ps"
                              value={form.is4ps}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Indigenous Group?</label>
                            <select
                              name="isIndigenous"
                              value={form.isIndigenous}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                            >
                              <option value="No">No</option>
                              <option value="Yes">Yes</option>
                            </select>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 2: FAMILY & GUARDIAN DETAILS */}
                  {step === 2 && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                        <Users size={14} className="text-[#76DA0D]" />
                        <h4 className="font-serif text-sm font-bold text-[#102604]">2. Parent & Guardian Profile</h4>
                      </div>

                      <p className="text-[10px] text-slate-400 italic">Specify the primary contact profile for this student enrollment.</p>

                      {/* Profile Tab Selector */}
                      <div className="flex border border-slate-200 bg-slate-50/50 p-1 mb-2 gap-1">
                        <button
                          type="button"
                          onClick={() => setContactType("father")}
                          className={`flex-1 py-2 text-center font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                            contactType === "father"
                              ? "bg-[#76DA0D] text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                          }`}
                        >
                          Father's Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactType("mother")}
                          className={`flex-1 py-2 text-center font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                            contactType === "mother"
                              ? "bg-[#76DA0D] text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                          }`}
                        >
                          Mother's Profile
                        </button>
                        <button
                          type="button"
                          onClick={() => setContactType("guardian")}
                          className={`flex-1 py-2 text-center font-bold text-[9px] uppercase tracking-widest transition-all cursor-pointer ${
                            contactType === "guardian"
                              ? "bg-[#76DA0D] text-white shadow-xs"
                              : "text-slate-500 hover:text-slate-800 hover:bg-slate-100/50"
                          }`}
                        >
                          Guardian's Profile
                        </button>
                      </div>

                      {/* Father Input fields */}
                      {contactType === "father" && (
                        <div className="bg-slate-50/30 p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                          <div className="md:col-span-3 font-semibold text-[10px] uppercase tracking-wider text-slate-600">Father's Information</div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Father's Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="fatherName"
                              value={form.fatherName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Contact Number</label>
                            <input
                              type="text"
                              name="fatherContact"
                              value={form.fatherContact}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Digits only"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Source of Income</label>
                            <input
                              type="text"
                              name="fatherIncome"
                              value={form.fatherIncome}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="e.g. Driver, Teacher, None"
                            />
                          </div>
                        </div>
                      )}

                      {/* Mother Input fields */}
                      {contactType === "mother" && (
                        <div className="bg-slate-50/30 p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fadeIn">
                          <div className="md:col-span-3 font-semibold text-[10px] uppercase tracking-wider text-slate-600">Mother's Information</div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Mother's Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="motherName"
                              value={form.motherName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Contact Number</label>
                            <input
                              type="text"
                              name="motherContact"
                              value={form.motherContact}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Digits only"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Source of Income</label>
                            <input
                              type="text"
                              name="motherIncome"
                              value={form.motherIncome}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="e.g. Vendor, Clerk, None"
                            />
                          </div>
                        </div>
                      )}

                      {/* Guardian Input fields */}
                      {contactType === "guardian" && (
                        <div className="bg-slate-50/30 p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-4 animate-fadeIn">
                          <div className="md:col-span-4 font-semibold text-[10px] uppercase tracking-wider text-slate-600">Guardian's Information</div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Guardian's Name <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="guardianName"
                              value={form.guardianName}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Full name"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Relationship <span className="text-red-500">*</span></label>
                            <input
                              type="text"
                              name="guardianRelationship"
                              value={form.guardianRelationship}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="e.g. Grandmother, Aunt"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Contact Number</label>
                            <input
                              type="text"
                              name="guardianContact"
                              value={form.guardianContact}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Digits only"
                            />
                          </div>
                          <div>
                            <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Source of Income</label>
                            <input
                              type="text"
                              name="guardianIncome"
                              value={form.guardianIncome}
                              onChange={handleChange}
                              className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                              placeholder="Source of income"
                            />
                          </div>
                        </div>
                      )}
                    </motion.div>
                  )}

                  {/* STEP 3: HOUSEHOLD & ADDRESS */}
                  {step === 3 && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                        <Home size={14} className="text-[#76DA0D]" />
                        <h4 className="font-serif text-sm font-bold text-[#102604]">3. Household Dynamics & Residence address</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">No. of Siblings</label>
                          <input
                            type="number"
                            name="siblingsCount"
                            min={0}
                            value={form.siblingsCount || ""}
                            onChange={handleNumberChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">No. of Siblings Below 18 y/o</label>
                          <input
                            type="number"
                            name="siblingsBelow18"
                            min={0}
                            value={form.siblingsBelow18 || ""}
                            onChange={handleNumberChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Ordinal order <span className="text-slate-400 font-normal">(e.g. 1st child)</span></label>
                          <select
                            name="ordinalOrder"
                            value={form.ordinalOrder}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                          >
                            <option value="1st">1st Child (Eldest)</option>
                            <option value="2nd">2nd Child</option>
                            <option value="3rd">3rd Child</option>
                            <option value="4th">4th Child</option>
                            <option value="5th">5th Child</option>
                            <option value="6th or more">6th Child or more</option>
                            <option value="Only Child">Only Child</option>
                          </select>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 pt-2">
                        <div className="md:col-span-4 font-semibold text-[11px] uppercase tracking-wider text-slate-600">Residence Address</div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">House Number</label>
                          <input
                            type="text"
                            name="houseNumber"
                            value={form.houseNumber}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Blk 1 Lot 2"
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Street <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="street"
                            value={form.street}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Rizal St"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">Barangay <span className="text-red-500">*</span></label>
                          <input
                            type="text"
                            name="barangay"
                            value={form.barangay}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D]"
                            placeholder="e.g. Barangay 58"
                            required
                          />
                        </div>
                        <div>
                          <label className="block text-[9px] uppercase tracking-wider font-bold text-slate-500 mb-1">City (NCR Cities) <span className="text-red-500">*</span></label>
                          <select
                            name="city"
                            value={form.city}
                            onChange={handleChange}
                            className="w-full px-3 py-2 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                          >
                            {NCR_CITIES.map((city) => (
                              <option key={city} value={city}>{city}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* STEP 4: SCHOOLING PREFERENCES & CONNECTIVITY */}
                  {step === 4 && (
                    <motion.div
                      initial={{ opacity: 0, x: 5 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="space-y-4"
                    >
                      <div className="flex items-center gap-2 border-b border-slate-100 pb-2 mb-2">
                        <BookOpen size={14} className="text-[#76DA0D]" />
                        <h4 className="font-serif text-sm font-bold text-[#102604]">4. Schooling Preferences & Internet Access</h4>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="bg-slate-50 p-5 border border-slate-100 rounded-none space-y-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-1.5">Learning Modality Preference <span className="text-red-500">*</span></label>
                            <select
                              name="learningModality"
                              value={form.learningModality}
                              onChange={handleChange}
                              className="w-full px-3 py-2.5 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                            >
                              <option value="Face-to-Face">Face-to-Face</option>
                              <option value="Modular (print)">Modular (Print)</option>
                              <option value="Modular (digital)">Modular (Digital)</option>
                              <option value="Online Distance Learning">Online Distance Learning</option>
                              <option value="Blended Learning">Blended Learning</option>
                              <option value="Radio/TV Based Instruction">Radio/TV Based Instruction</option>
                            </select>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Specifies the teaching-learning setup preferred by parents or suited for the student's current household capability.
                          </p>
                        </div>

                        <div className="bg-slate-50 p-5 border border-slate-100 rounded-none space-y-4">
                          <div>
                            <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-600 mb-1.5">Available Internet Connectivity <span className="text-red-500">*</span></label>
                            <select
                              name="internetConnectivity"
                              value={form.internetConnectivity}
                              onChange={handleChange}
                              className="w-full px-3 py-2.5 border border-slate-300 text-xs focus:outline-none focus:border-[#76DA0D] bg-white"
                            >
                              <option value="None">None</option>
                              <option value="Mobile Data">Mobile Data</option>
                              <option value="Fiber broadband internet (wifi)">Fiber broadband internet (wifi)</option>
                              <option value="Community hotspot">Community hotspot</option>
                            </select>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Specifies the digital resource accessibility level at home for remote or modular print hybrid systems.
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Form Footer Buttons */}
                  <div className="flex justify-between items-center pt-6 border-t border-slate-100 shrink-0">
                    <div>
                      {step > 1 && (
                        <button
                          type="button"
                          onClick={handlePrev}
                          className="flex items-center gap-1 px-4 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                        >
                          <ArrowLeft size={12} />
                          <span>Previous Step</span>
                        </button>
                      )}
                    </div>

                    <div>
                      {step < 4 ? (
                        <button
                          type="button"
                          onClick={handleNext}
                          className="flex items-center gap-1 px-4 py-2 bg-[#76DA0D] text-[#102604] hover:bg-[#88F015] border border-[#FFEA00] font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer shadow-xs"
                        >
                          <span>Next Step</span>
                          <ArrowRight size={12} />
                        </button>
                      ) : (
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          onClick={handleIndividualSubmit}
                          className="flex items-center gap-1 px-6 py-2 bg-[#102604] hover:bg-slate-900 text-white font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer"
                        >
                          <Check size={12} className="text-[#76DA0D]" />
                          <span>{isSubmitting ? "Syncing..." : "Finalize Registration"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                </form>
              )}

              {/* BULK CSV REGISTRATION */}
              {method === "bulk" && (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-slate-50 p-5 border border-slate-200 gap-4 rounded-none">
                    <div className="space-y-1 max-w-lg">
                      <h4 className="font-serif text-sm font-bold text-[#102604]">1. Prepare Registration CSV File</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        To register multiple students quickly, download our official CSV spreadsheet template containing all necessary columns. Populate it, then upload the file below.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={downloadTemplate}
                      className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-50 text-[#102604] border border-slate-300 font-bold text-[10px] uppercase tracking-widest transition-all cursor-pointer whitespace-nowrap"
                    >
                      <Download size={13} className="text-[#76DA0D]" />
                      <span>Download CSV Template</span>
                    </button>
                  </div>

                  {/* Drag and Drop Zone */}
                  <div
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed rounded-none p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                      isDragOver
                        ? "border-[#76DA0D] bg-[#76DA0D]/5"
                        : csvFile
                        ? "border-emerald-500 bg-emerald-50/10"
                        : "border-slate-300 hover:border-[#76DA0D] hover:bg-slate-50"
                    }`}
                  >
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileSelectChange}
                      accept=".csv"
                      className="hidden"
                    />

                    <UploadCloud size={32} className={`mb-3 ${csvFile ? "text-emerald-500" : "text-slate-400"}`} />
                    
                    {csvFile ? (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#102604]">{csvFile.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{(csvFile.size / 1024).toFixed(2)} KB • Found {csvPreview.length} students</p>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-[#102604]">Drag and drop your populated CSV here</p>
                        <p className="text-[10px] text-slate-400 font-mono">or click to browse your local computer files</p>
                      </div>
                    )}
                  </div>

                  {csvError && (
                    <div className="p-3 bg-red-50 border border-red-200 text-red-800 text-xs flex items-center gap-2">
                      <AlertTriangle size={14} className="shrink-0" />
                      <span className="font-semibold">{csvError}</span>
                    </div>
                  )}

                  {/* Preview Rows */}
                  {csvPreview.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                        <h4 className="font-serif text-xs font-bold text-slate-700">Previewing Registrants ({csvPreview.length} rows)</h4>
                        <button
                          onClick={() => {
                            setCsvPreview([]);
                            setCsvFile(null);
                          }}
                          className="text-xs text-red-600 hover:underline cursor-pointer"
                        >
                          Clear File
                        </button>
                      </div>

                      <div className="border border-slate-200 overflow-x-auto max-h-60 rounded-none bg-white">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold tracking-wider text-slate-400">
                              <th className="p-2 border-r border-slate-100">LRN</th>
                              <th className="p-2 border-r border-slate-100">Student Name</th>
                              <th className="p-2 border-r border-slate-100">Grade Level</th>
                              <th className="p-2 border-r border-slate-100">Section</th>
                              <th className="p-2 border-r border-slate-100">Gender</th>
                              <th className="p-2 border-r border-slate-100">Birthdate</th>
                              <th className="p-2">Learning Modality</th>
                            </tr>
                          </thead>
                          <tbody className="font-mono text-[10px]">
                            {csvPreview.slice(0, 10).map((student, index) => (
                              <tr key={index} className="border-b border-slate-100 hover:bg-slate-50">
                                <td className="p-2 border-r border-slate-100 text-slate-700 font-bold">{student.lrn}</td>
                                <td className="p-2 border-r border-slate-100 text-[#102604]">{student.lastName}, {student.firstName} {student.middleName || ""}</td>
                                <td className="p-2 border-r border-slate-100 text-slate-600">{student.gradeLevel}</td>
                                <td className="p-2 border-r border-slate-100 text-slate-600">{student.section}</td>
                                <td className="p-2 border-r border-slate-100 text-slate-600">{student.gender}</td>
                                <td className="p-2 border-r border-slate-100 text-slate-600">{student.dateOfBirth}</td>
                                <td className="p-2 text-slate-600">{student.learningModality}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {csvPreview.length > 10 && (
                          <div className="p-2 bg-slate-50 border-t border-slate-100 text-center text-[10px] text-slate-400 italic">
                            Showing first 10 students of {csvPreview.length} rows...
                          </div>
                        )}
                      </div>

                      <div className="flex justify-end pt-4">
                        <button
                          type="button"
                          onClick={handleBulkSubmit}
                          disabled={isSubmitting}
                          className="flex items-center gap-1.5 px-6 py-2.5 bg-[#102604] hover:bg-slate-900 text-white font-bold text-xs uppercase tracking-widest transition-all cursor-pointer shadow-md"
                        >
                          <Check size={14} className="text-[#76DA0D]" />
                          <span>{isSubmitting ? "Syncing Bulk Registry..." : `Confirm & Save ${csvPreview.length} Students`}</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
}
