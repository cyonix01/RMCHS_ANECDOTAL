/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { X, Search, Calendar, FileText, Download, Filter, User, ChevronRight, AlertCircle, ShieldAlert, Clock, Trash2, CheckSquare, Square, Paperclip, ExternalLink, CheckCircle, XCircle } from "lucide-react";
import Swal from "sweetalert2";
import { Report, CriticalReport } from "../types";
import { useNotification } from "./NotificationProvider";
import { getDriveImageUrl } from "../utils/driveUtils";

interface ReportsViewerModalProps {
  onClose: () => void;
  userEmail: string;
  userRole?: string;
  userGradeLevel?: string;
  userSection?: string;
  userFirstName?: string;
  userLastName?: string;
  initialSearchQuery?: string;
  showOnlyResolved?: boolean;
  showOnlyPendingApproval?: boolean;
}

interface CombinedReport {
  id: string | number;
  studentName: string;
  studentLrn: string;
  profilePictureUrl?: string;
  grade: string;
  section: string;
  issue: string;
  dateReported: string;
  dateOfIncident: string;
  timeOfIncident: string;
  reportedBy: string;
  details: string;
  actionTaken: string;
  recommendation: string;
  type: 'General' | 'Critical';
  lastUpdatedBy?: string;
  recordStatus?: 'On Going' | 'Pending Approval' | 'RESOLVED';
}

function parseRobustDateTime(val: any): Date | null {
  if (val === null || val === undefined) return null;
  
  if (val instanceof Date) {
    return isNaN(val.getTime()) ? null : val;
  }
  
  if (typeof val === "number") {
    const adjusted = val < 10000000000 ? val * 1000 : val;
    const d = new Date(adjusted);
    return isNaN(d.getTime()) ? null : d;
  }
  
  if (typeof val === "string") {
    let trimmed = val.trim();
    if (!trimmed) return null;
    
    if (/^\d+$/.test(trimmed)) {
      const num = Number(trimmed);
      const adjusted = num < 10000000000 ? num * 1000 : num;
      const d = new Date(adjusted);
      if (!isNaN(d.getTime())) return d;
    }
    
    if (/^\d{4}-\d{2}-\d{2}\s+\d{2}:\d{2}(:\d{2})?(\.\d+)?$/.test(trimmed)) {
      trimmed = trimmed.replace(/\s+/, 'T');
    }
    
    let d = new Date(trimmed);
    if (!isNaN(d.getTime())) return d;
    
    d = new Date(trimmed.replace(/\//g, '-'));
    if (!isNaN(d.getTime())) return d;
  }
  
  return null;
}

function getReportSortValue(report: CombinedReport): number {
  if (!report) return 0;
  
  const dateReportedVal = report.dateReported;
  const parsedReported = parseRobustDateTime(dateReportedVal);
  if (parsedReported) {
    return parsedReported.getTime();
  }
  
  const dateOfIncidentVal = report.dateOfIncident;
  const timeOfIncidentVal = report.timeOfIncident;
  
  if (dateOfIncidentVal) {
    const datePart = String(dateOfIncidentVal).trim();
    const timePart = String(timeOfIncidentVal || "00:00").trim();
    const parsedIncident = parseRobustDateTime(`${datePart}T${timePart}`);
    if (parsedIncident) {
      return parsedIncident.getTime();
    }
    const parsedJustDate = parseRobustDateTime(datePart);
    if (parsedJustDate) {
      return parsedJustDate.getTime();
    }
  }
  
  return 0;
}

const ReportsViewerModal: React.FC<ReportsViewerModalProps> = ({ 
  onClose, 
  userEmail, 
  userRole,
  userGradeLevel,
  userSection,
  userFirstName,
  userLastName,
  initialSearchQuery = "",
  showOnlyResolved = false,
  showOnlyPendingApproval = false
}) => {
  const { notify, confirm } = useNotification();
  const [reports, setReports] = useState<CombinedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState(initialSearchQuery);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [typeFilter, setTypeFilter] = useState<'All' | 'General' | 'Critical'>('All');
  const [selectedReportForView, setSelectedReportForView] = useState<CombinedReport | null>(null);
  const [recommendationEdit, setRecommendationEdit] = useState("");
  const [statusEdit, setStatusEdit] = useState<'On Going' | 'Pending Approval' | 'RESOLVED'>('On Going');
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDetail, setShowDetail] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [movFile, setMovFile] = useState<File | null>(null);
  const [adminComment, setAdminComment] = useState("");
  const [selectedReportIds, setSelectedReportIds] = useState<Set<string | number>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [isSavingRec, setIsSavingRec] = useState(false);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const fetchAllData = React.useCallback(async () => {
    if (!isMountedRef.current) return;
    try {
      const [genRes, critRes, studentRes] = await Promise.all([
        fetch("/api/reports"),
        fetch("/api/critical-reports"),
        fetch("/api/students")
      ]);

      if (!isMountedRef.current) return;

      if (genRes.ok && critRes.ok && studentRes.ok) {
        const genData: Report[] = await genRes.json();
        const critData: CriticalReport[] = await critRes.json();
        const students: any[] = await studentRes.json();

        if (!isMountedRef.current) return;

        const studentMap = new Map(students.map(s => [s.lrn, { name: `${s.firstName} ${s.lastName}`, grade: s.gradeLevel, section: s.section, profilePictureUrl: s.profilePictureUrl }]));

        const combined: CombinedReport[] = [
          ...genData.map(r => {
            const sInfo = studentMap.get(r.studentLrn) || { name: "Unknown Student", grade: "N/A", section: "N/A", profilePictureUrl: "" };
            return {
              id: r.id || Math.random(),
              studentName: sInfo.name,
              studentLrn: r.studentLrn,
              profilePictureUrl: sInfo.profilePictureUrl,
              grade: sInfo.grade,
              section: sInfo.section,
              issue: r.issue,
              dateReported: r.dateReported,
              dateOfIncident: r.dateOfIncident,
              timeOfIncident: r.timeOfIncident,
              reportedBy: r.reportedBy,
              details: r.description || '',
              actionTaken: r.actionTaken || 'N/A',
              recommendation: r.recommendation || '',
              type: 'General' as const,
              lastUpdatedBy: r.lastUpdatedBy,
              recordStatus: r.recordStatus
            };
          }),
          ...critData.map(r => {
            const sInfo = studentMap.get(r.studentLrn) || { name: "Unknown Student", grade: "N/A", section: "N/A", profilePictureUrl: "" };
            return {
              id: r.id || Math.random(),
              studentName: sInfo.name,
              studentLrn: r.studentLrn,
              profilePictureUrl: sInfo.profilePictureUrl,
              grade: sInfo.grade,
              section: sInfo.section,
              issue: r.issue || (r as any).natureOfIncident || 'Critical Incident',
              dateReported: r.dateReported,
              dateOfIncident: r.dateOfIncident || (r as any).incidentDate || 'N/A',
              timeOfIncident: r.timeOfIncident || (r as any).incidentTime || 'N/A',
              reportedBy: r.reportedBy,
              details: r.description || '',
              actionTaken: r.actionTaken || (r as any).immediateActionTaken || 'N/A',
              recommendation: r.recommendation || '',
              type: 'Critical' as const,
              lastUpdatedBy: r.lastUpdatedBy,
              recordStatus: r.recordStatus
            };
          })
        ];

        const teacherName = `${userFirstName || ''} ${userLastName || ''}`.trim();
        let filteredCombined = combined;

        if (userRole === 'Admin' || userRole === 'Guidance') {
          // Admin and Guidance see all records across entire school
        } else if (userRole === 'Adviser') {
          // Advisers see only records under their sections/gradeLevel
          filteredCombined = combined.filter(r => r.grade === userGradeLevel && r.section === userSection);
        } else {
          // Fallback or Non-Adviser (only see reports they reported)
          filteredCombined = combined.filter(r => r.reportedBy === teacherName);
        }

        // Sort by date and time descending
        filteredCombined.sort((a, b) => {
          const valA = getReportSortValue(a);
          const valB = getReportSortValue(b);
          if (valA !== valB) return valB - valA;
          return String(b.id).localeCompare(String(a.id));
        });
        if (isMountedRef.current) {
          setReports(filteredCombined);
        }
      } else {
        if (isMountedRef.current) {
          notify("error", "Failed to retrieve institutional records.");
        }
      }
    } catch (err) {
      if (isMountedRef.current) {
        notify("error", "Network error while accessing database.");
      }
    } finally {
      if (isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [userFirstName, userLastName, userRole, userGradeLevel, userSection, notify]);

  useEffect(() => {
    setLoading(true);
    fetchAllData();
    const interval = setInterval(fetchAllData, 10000);
    return () => clearInterval(interval);
  }, [fetchAllData]);

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const base64String = (reader.result as string).split(',')[1];
        resolve(base64String);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  const handleSaveRecommendation = async () => {
    if (!selectedReportForView) return;
    setIsSavingRec(true);
    try {
      const endpoint = selectedReportForView.type === 'General' 
        ? `/api/reports/${selectedReportForView.id}/recommendation`
        : `/api/critical-reports/${selectedReportForView.id}/recommendation`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recommendation: recommendationEdit,
          updatedBy: userEmail
        })
      });

      if (res.ok) {
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { ...r, recommendation: recommendationEdit, lastUpdatedBy: userEmail }
            : r
        ));
        setSelectedReportForView(prev => prev ? { 
          ...prev, 
          recommendation: recommendationEdit, 
          lastUpdatedBy: userEmail 
        } : null);

        await Swal.fire({
          title: "Saved!",
          text: "Guidance Recommendations saved successfully.",
          icon: "success",
          confirmButtonColor: "#102604"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        await Swal.fire({
          title: "Error",
          text: errData.error || "Failed to save Guidance Recommendations.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Network error while saving recommendations.",
        icon: "error",
        confirmButtonColor: "#102604"
      });
    } finally {
      setIsSavingRec(false);
    }
  };

  const handleSetOngoing = async () => {
    if (!selectedReportForView) return;
    setIsUpdating(true);
    try {
      const res = await fetch(`/api/reports/${selectedReportForView.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "On Going",
          type: selectedReportForView.type
        })
      });

      if (res.ok) {
        setStatusEdit("On Going");
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { ...r, recordStatus: "On Going" }
            : r
        ));
        setSelectedReportForView(prev => prev ? { ...prev, recordStatus: "On Going" } : null);

        await Swal.fire({
          title: "Status Updated",
          text: "Report status set to On Going.",
          icon: "success",
          confirmButtonColor: "#102604"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        await Swal.fire({
          title: "Error",
          text: errData.error || "Failed to set status to On Going.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Network error while updating status.",
        icon: "error",
        confirmButtonColor: "#102604"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!selectedReportForView) return;

    if (!movFile) {
      await Swal.fire({
        title: "MOV File Required",
        text: "Please attach/upload a Means of Verification (MOV) file before submitting for approval.",
        icon: "warning",
        confirmButtonColor: "#102604"
      });
      return;
    }

    setIsUpdating(true);
    try {
      let filePayload = null;
      try {
        const base64Data = await fileToBase64(movFile);
        const originalName = movFile.name;
        const extension = originalName.substring(originalName.lastIndexOf('.') + 1) || 'bin';
        const formattedFileName = `Report_${selectedReportForView.id}_${selectedReportForView.grade}_${selectedReportForView.section}.${extension}`;

        filePayload = {
          name: formattedFileName,
          base64: base64Data,
          mimeType: movFile.type || "application/octet-stream"
        };
      } catch (err) {
        await Swal.fire({
          title: "Error",
          text: "Failed to process MOV file.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
        setIsUpdating(false);
        return;
      }

      const resStatus = await fetch(`/api/reports/${selectedReportForView.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "Pending Approval",
          type: selectedReportForView.type,
          file: filePayload,
          adminComment: adminComment.trim() || undefined
        })
      });

      const dataStatus = await resStatus.json().catch(() => ({}));

      if (resStatus.ok) {
        setStatusEdit("Pending Approval");
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { ...r, recordStatus: "Pending Approval" }
            : r
        ));
        setSelectedReportForView(prev => prev ? { ...prev, recordStatus: "Pending Approval" } : null);
        setMovFile(null);
        setAdminComment("");

        await Swal.fire({
          title: "Submitted for Approval",
          text: "Report status changed to Pending Approval and sent to the Pending Approval tab.",
          icon: "success",
          confirmButtonColor: "#102604"
        });
      } else {
        await Swal.fire({
          title: "Error",
          text: dataStatus.error || "Failed to submit report for approval.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Network error while submitting for approval.",
        icon: "error",
        confirmButtonColor: "#102604"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproveReport = async () => {
    if (!selectedReportForView) return;

    const result = await Swal.fire({
      title: "Approve Report?",
      text: "This will approve the report and mark its status as RESOLVED.",
      icon: "question",
      showCancelButton: true,
      confirmButtonColor: "#102604",
      cancelButtonColor: "#64748b",
      confirmButtonText: "Yes, Approve",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    setIsUpdating(true);
    try {
      const res = await fetch(`/api/reports/${selectedReportForView.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "RESOLVED",
          type: selectedReportForView.type
        })
      });

      if (res.ok) {
        setStatusEdit("RESOLVED");
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { ...r, recordStatus: "RESOLVED" }
            : r
        ));
        setSelectedReportForView(prev => prev ? { ...prev, recordStatus: "RESOLVED" } : null);

        await Swal.fire({
          title: "Report Approved!",
          text: "The report has been approved and moved to Resolved Reports Archive.",
          icon: "success",
          confirmButtonColor: "#102604"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        await Swal.fire({
          title: "Error",
          text: errData.error || "Failed to approve report.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Network error while approving report.",
        icon: "error",
        confirmButtonColor: "#102604"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDisapproveReport = async () => {
    if (!selectedReportForView) return;

    const currentRec = recommendationEdit || selectedReportForView.recommendation || "";

    const { value: formValues } = await Swal.fire({
      title: "Disapprove Report",
      html: `
        <div style="text-align: left; font-size: 12px; color: #334155;">
          <p style="margin-bottom: 12px; font-weight: 600; color: #b91c1c;">
            Please explain why this report was disapproved and edit or provide recommended actions for the reporting officer.
          </p>

          <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 4px;">
            Reason for Disapproval <span style="color: #ef4444;">*</span>
          </label>
          <textarea id="swal-disapproval-reason" class="swal2-textarea" style="width: 100%; height: 80px; margin: 0 0 14px 0; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="State why the report was disapproved..."></textarea>

          <label style="display: block; font-weight: 700; font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 4px;">
            Recommended Action / Revised Guidance Recommendations <span style="color: #ef4444;">*</span>
          </label>
          <textarea id="swal-recommended-action" class="swal2-textarea" style="width: 100%; height: 100px; margin: 0; padding: 8px; font-size: 12px; border: 1px solid #cbd5e1; border-radius: 4px;" placeholder="Specify recommended corrective actions or updated recommendations...">${currentRec}</textarea>
        </div>
      `,
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: "Disapprove & Return",
      confirmButtonColor: "#dc2626",
      cancelButtonText: "Cancel",
      cancelButtonColor: "#64748b",
      preConfirm: () => {
        const reasonEl = document.getElementById('swal-disapproval-reason') as HTMLTextAreaElement;
        const recEl = document.getElementById('swal-recommended-action') as HTMLTextAreaElement;
        const reason = reasonEl ? reasonEl.value.trim() : "";
        const rec = recEl ? recEl.value.trim() : "";

        if (!reason) {
          Swal.showValidationMessage("Reason for disapproval is required.");
          return false;
        }
        if (!rec) {
          Swal.showValidationMessage("Recommended action / guidance recommendation is required.");
          return false;
        }

        return { disapprovalReason: reason, recommendedAction: rec };
      }
    });

    if (!formValues) return;

    setIsUpdating(true);
    try {
      // 1. Update recommendation field with recommendedAction
      await fetch(`/api/reports/${selectedReportForView.id}/recommendation`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recommendation: formValues.recommendedAction,
          userEmail
        })
      });

      // 2. Update status back to 'On Going' with adminComment containing disapproval reason & recommended action
      const adminNote = `[DISAPPROVED BY APPROVER] Reason: ${formValues.disapprovalReason}\nRecommended Action: ${formValues.recommendedAction}`;
      const res = await fetch(`/api/reports/${selectedReportForView.id}/status`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "On Going",
          type: selectedReportForView.type,
          adminComment: adminNote
        })
      });

      if (res.ok) {
        setStatusEdit("On Going");
        setRecommendationEdit(formValues.recommendedAction);
        setReports(prev => prev.map(r => 
          (r.id === selectedReportForView.id && r.type === selectedReportForView.type)
            ? { 
                ...r, 
                recordStatus: "On Going", 
                recommendation: formValues.recommendedAction,
                lastUpdatedBy: userEmail
              }
            : r
        ));
        setSelectedReportForView(prev => prev ? { 
          ...prev, 
          recordStatus: "On Going", 
          recommendation: formValues.recommendedAction,
          lastUpdatedBy: userEmail 
        } : null);

        await Swal.fire({
          title: "Report Disapproved",
          text: "The report status was returned to 'On Going'. The revised recommendation and disapproval feedback were saved.",
          icon: "info",
          confirmButtonColor: "#102604"
        });
      } else {
        const errData = await res.json().catch(() => ({}));
        await Swal.fire({
          title: "Error",
          text: errData.error || "Failed to disapprove report.",
          icon: "error",
          confirmButtonColor: "#102604"
        });
      }
    } catch (err) {
      await Swal.fire({
        title: "Error",
        text: "Network error while disapproving report.",
        icon: "error",
        confirmButtonColor: "#102604"
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteReport = async (report: CombinedReport) => {
    confirm({
      title: "Delete Report",
      message: `Are you sure you want to delete this ${report.type} report for ${report.studentName}? This action cannot be undone.`,
      confirmText: "Delete",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
        try {
          const endpoint = report.type === 'General' 
            ? `/api/reports/${report.id}` 
            : `/api/critical-reports/${report.id}`;
          
          const res = await fetch(endpoint, { method: 'DELETE' });
          if (res.ok) {
            notify("success", "Report successfully deleted from registry.");
            setReports(prev => prev.filter(r => !(r.id === report.id && r.type === report.type)));
            setSelectedReportIds(prev => {
              const next = new Set(prev);
              next.delete(`${report.type}-${report.id}`);
              return next;
            });
            setShowDetail(false);
          } else {
            const errData = await res.json();
            notify("error", errData.error || "Failed to delete report.");
          }
        } catch (err) {
          notify("error", "Connection error while deleting report.");
        } finally {
          setIsDeleting(false);
        }
      }
    });
  };

  const handleBulkDelete = async () => {
    if (selectedReportIds.size === 0) return;
    
    confirm({
      title: "Bulk Delete",
      message: `Are you sure you want to delete ${selectedReportIds.size} selected reports? This action cannot be undone.`,
      confirmText: "Delete All",
      variant: "danger",
      onConfirm: async () => {
        setIsDeleting(true);
    let successCount = 0;
    let failCount = 0;

    for (const compositeId of selectedReportIds) {
      const [type, id] = (compositeId as string).split('-');
      try {
        const endpoint = type === 'Critical' ? `/api/critical-reports/${id}` : `/api/reports/${id}`;
        const res = await fetch(endpoint, { method: 'DELETE' });
        if (res.ok) {
          successCount++;
        } else {
          failCount++;
        }
      } catch (err) {
        failCount++;
      }
    }

        if (successCount > 0) {
          notify("success", `Successfully deleted ${successCount} reports.`);
          setReports(prev => prev.filter(r => !selectedReportIds.has(`${r.type}-${r.id}`)));
          setSelectedReportIds(new Set());
        }
        if (failCount > 0) {
          notify("error", `Failed to delete ${failCount} reports.`);
        }
        setIsDeleting(false);
      }
    });
  };

  const toggleSelectAll = () => {
    if (selectedReportIds.size === filteredReports.length) {
      setSelectedReportIds(new Set());
    } else {
      const newIds = new Set(filteredReports.map(r => `${r.type}-${r.id}`));
      setSelectedReportIds(newIds);
    }
  };

  const toggleSelectReport = (report: CombinedReport) => {
    const compositeId = `${report.type}-${report.id}`;
    setSelectedReportIds(prev => {
      const next = new Set(prev);
      if (next.has(compositeId)) {
        next.delete(compositeId);
      } else {
        next.add(compositeId);
      }
      return next;
    });
  };

  const filteredReports = useMemo(() => {
    const filtered = reports.filter(report => {
      const matchesSearch = 
        report.studentName?.toLowerCase()?.includes(searchQuery.toLowerCase()) ||
        report.studentLrn?.includes(searchQuery);
      
      let reportDateStr = "";
      if (report.dateReported) {
        try {
          const d = new Date(report.dateReported);
          if (!isNaN(d.getTime())) {
            const trimmedDate = String(report.dateReported).trim();
            if (/^\d{4}-\d{2}-\d{2}$/.test(trimmedDate)) {
              reportDateStr = trimmedDate;
            } else if (/^\d{4}-\d{2}-\d{2}\s/.test(trimmedDate) || /^\d{4}-\d{2}-\d{2}T/.test(trimmedDate)) {
              reportDateStr = trimmedDate.substring(0, 10);
            } else {
              const year = d.getFullYear();
              const month = String(d.getMonth() + 1).padStart(2, '0');
              const day = String(d.getDate()).padStart(2, '0');
              reportDateStr = `${year}-${month}-${day}`;
            }
          }
        } catch (e) {}
      }
      if (!reportDateStr && report.dateReported) {
        reportDateStr = String(report.dateReported).substring(0, 10);
      }

      const matchesStart = startDate ? reportDateStr >= startDate : true;
      const matchesEnd = endDate ? reportDateStr <= endDate : true;
      const matchesType = typeFilter === 'All' ? true : report.type === typeFilter;

      const status = (report.recordStatus || 'On Going').trim().toUpperCase();
      if (showOnlyResolved) {
        if (status !== 'RESOLVED') return false;
      } else if (showOnlyPendingApproval) {
        if (status !== 'PENDING APPROVAL' && status !== 'PENDING') return false;
      } else {
        if (status === 'RESOLVED' || status === 'PENDING APPROVAL' || status === 'PENDING') return false;
      }

      return matchesSearch && matchesStart && matchesEnd && matchesType;
    });

    return filtered.sort((a, b) => {
      const valA = getReportSortValue(a);
      const valB = getReportSortValue(b);
      if (valA !== valB) return valB - valA;
      return String(b.id).localeCompare(String(a.id));
    });
  }, [reports, searchQuery, startDate, endDate, typeFilter, showOnlyResolved, showOnlyPendingApproval]);

  const handleExport = () => {
    if (filteredReports.length === 0) {
      notify("info", "No records available for export in current view.");
      return;
    }
    
    const csvContent = [
      ["Type", "Status", "Date Reported", "Incident Date", "Incident Time", "Student Name", "LRN", "Grade", "Section", "Issue/Incident", "Reported By", "Details"],
      ...filteredReports.map(r => [
        r.type,
        r.recordStatus || 'On Going',
        r.dateReported,
        r.dateOfIncident,
        r.timeOfIncident,
        r.studentName,
        r.studentLrn,
        r.grade,
        r.section,
        r.issue,
        r.reportedBy,
        `"${r.details.replace(/"/g, '""')}"`
      ])
    ].map(e => e.join(",")).join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `Reports_Export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    notify("success", "Record archive exported successfully.");
  };

  const renderActionTaken = (text: string) => {
    if (!text) return "N/A";

    // Match markdown links: [MOV File: filename](fileUrl) or [filename](fileUrl)
    const markdownRegex = /\[(?:MOV File:\s*)?(.*?)\]\((.*?)\)/gi;
    const parts: React.ReactNode[] = [];
    let lastIndex = 0;
    let match;

    while ((match = markdownRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(<span key={`txt-${lastIndex}`}>{textBefore}</span>);
      }
      const fileName = match[1] || "Attachment";
      const fileUrl = match[2];
      const lowerName = fileName.toLowerCase();
      const lowerUrl = fileUrl.toLowerCase();
      
      const isVideo = lowerName.endsWith('.mov') || lowerName.endsWith('.mp4') || lowerName.endsWith('.webm') || lowerUrl.startsWith('data:video/') || lowerUrl.includes('.mov') || lowerUrl.includes('.mp4');
      const isImage = lowerName.endsWith('.png') || lowerName.endsWith('.jpg') || lowerName.endsWith('.jpeg') || lowerName.endsWith('.webp') || lowerName.endsWith('.gif') || lowerUrl.startsWith('data:image/');

      parts.push(
        <div key={`att-${match.index}`} className="mt-3 p-3.5 bg-slate-100/90 border border-slate-200 rounded-md flex flex-col gap-3 shadow-xs">
          <div className="flex items-center justify-between gap-2 min-w-0 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <Paperclip size={14} className="text-[#102604] shrink-0" />
              <span className="text-[10px] font-black uppercase tracking-wider text-[#102604] shrink-0">
                {isVideo ? 'Attached Video / MOV' : isImage ? 'Attached Image' : 'Attached File'}:
              </span>
              <span className="text-[11px] font-mono text-slate-700 truncate" title={fileName}>
                {fileName}
              </span>
            </div>
            <a 
              href={fileUrl} 
              target="_blank" 
              rel="noopener noreferrer" 
              className="px-3 py-1.5 bg-[#102604] text-white rounded-sm text-[9px] font-bold uppercase tracking-wider hover:bg-slate-800 transition-all flex items-center gap-1.5 shrink-0 shadow-xs cursor-pointer"
            >
              <ExternalLink size={12} />
              Open Attachment
            </a>
          </div>

          {isVideo && (
            <div className="mt-1">
              <video controls className="w-full max-h-80 rounded border border-slate-300 bg-black" src={fileUrl} />
            </div>
          )}

          {isImage && (
            <div className="mt-1">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <img src={fileUrl} alt={fileName} className="max-h-72 object-contain rounded border border-slate-300 bg-white" />
              </a>
            </div>
          )}
        </div>
      );
      lastIndex = markdownRegex.lastIndex;
    }

    const textRemaining = text.substring(lastIndex);
    if (textRemaining) {
      const urlRegex = /(https?:\/\/[^\s]+)/gi;
      const urlParts: React.ReactNode[] = [];
      let urlLastIndex = 0;
      let urlMatch;

      while ((urlMatch = urlRegex.exec(textRemaining)) !== null) {
        const preText = textRemaining.substring(urlLastIndex, urlMatch.index);
        if (preText) urlParts.push(<span key={`utxt-${urlLastIndex}`}>{preText}</span>);
        const linkUrl = urlMatch[1];
        urlParts.push(
          <a
            key={`urllink-${urlMatch.index}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-blue-600 hover:underline font-mono text-[11px] break-all my-1 px-2 py-1 bg-blue-50 border border-blue-200 rounded"
          >
            <ExternalLink size={11} />
            {linkUrl}
          </a>
        );
        urlLastIndex = urlRegex.lastIndex;
      }
      const leftover = textRemaining.substring(urlLastIndex);
      if (leftover) urlParts.push(<span key={`leftover-${urlLastIndex}`}>{leftover}</span>);

      parts.push(...urlParts);
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-[#102604]/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 20 }}
        className="bg-white w-full max-w-6xl shadow-2xl overflow-hidden flex flex-col h-[95vh] sm:h-[90vh] rounded-none sm:rounded-xl"
      >
        <div className="p-4 sm:p-8 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-[#76DA0D]/10 flex items-center justify-center rounded-full shrink-0">
              <FileText size={22} className="text-[#102604]" />
            </div>
            <div>
              <h3 className="serif font-serif text-lg sm:text-2xl text-slate-900 leading-tight">
                {showOnlyResolved ? "Resolved Reports Archive" : showOnlyPendingApproval ? "Pending Approval Reports" : "Institutional Record Archive"}
              </h3>
              <p className="text-[9px] sm:text-[10px] font-bold uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 mt-0.5">
                {showOnlyResolved ? "Registry of resolved student reports & incidents" : showOnlyPendingApproval ? "Registry of reports pending approval" : "Registry of student reports and critical incidents"}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-[#102604] hover:bg-slate-50 transition-all rounded-full shrink-0">
            <X size={22} />
          </button>
        </div>

        <div className="p-4 sm:p-8 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap items-end gap-3 sm:gap-6 shrink-0">
          <div className="w-full lg:flex-1 lg:min-w-[240px]">
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">Student Identity / LRN</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input
                type="text"
                placeholder="Search by name or LRN..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 sm:py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D] transition-colors"
              />
            </div>
          </div>

          <div className="w-full sm:w-auto lg:w-44">
            <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">Report Category</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as any)}
              className="w-full px-4 py-2 sm:py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D] appearance-none"
            >
              <option value="All">All Categories</option>
              <option value="General">General Reports</option>
              <option value="Critical">Critical incidents</option>
            </select>
          </div>

          <div className="w-full sm:w-auto flex items-center gap-2">
            <div className="flex-1 sm:w-40">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">From Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D]"
              />
            </div>
            <div className="flex-1 sm:w-40">
              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1.5 sm:mb-2">To Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 sm:px-4 py-2 sm:py-2.5 bg-white border border-slate-200 text-[11px] font-bold uppercase tracking-wider focus:outline-none focus:border-[#76DA0D]"
              />
            </div>
          </div>

          <button
            onClick={handleExport}
            className="w-full sm:w-auto px-6 py-2.5 bg-[#102604] text-white text-[10px] font-bold uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2 h-[42px]"
          >
            <Download size={14} />
            <span>Export CSV</span>
          </button>

          {userRole === 'Admin' && selectedReportIds.size > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="w-full sm:w-auto px-6 py-2.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-widest hover:bg-red-700 transition-all flex items-center justify-center gap-2 h-[42px]"
            >
              <Trash2 size={14} />
              <span>Delete ({selectedReportIds.size})</span>
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-white">
          {loading ? (
            <div className="h-full flex flex-col items-center justify-center gap-4 py-20">
              <div className="w-12 h-[1px] bg-[#76DA0D] animate-pulse" />
              <p className="serif italic text-slate-400 text-lg">Synchronizing Archive...</p>
            </div>
          ) : filteredReports.length > 0 ? (
            <>
              {/* Mobile Portrait Card View */}
              <div className="block sm:hidden space-y-3">
                {filteredReports.map((report, idx) => (
                  <div key={`mob-${report.type}-${report.id}-${idx}`} className="bg-slate-50 border border-slate-200 p-4 rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                        report.type === 'Critical' ? 'border-red-100 text-red-600 bg-red-50' : 'border-blue-100 text-blue-600 bg-blue-50'
                      }`}>
                        {report.type}
                      </span>
                      <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                        report.recordStatus === 'RESOLVED' ? 'border-[#76DA0D]/20 text-[#102604] bg-[#76DA0D]/10' : report?.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'
                      }`}>
                        {report.recordStatus || 'On Going'}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      {report.profilePictureUrl ? (
                        <img 
                          src={getDriveImageUrl(report.profilePictureUrl)} 
                          alt={report.studentName}
                          className="w-10 h-10 rounded-full object-cover border border-slate-200 shrink-0"
                          referrerPolicy="no-referrer"
                        />
                      ) : (
                        <div className="w-10 h-10 bg-slate-200 flex items-center justify-center rounded-full shrink-0">
                          <User size={16} className="text-slate-500" />
                        </div>
                      )}
                      <div>
                        <p className="text-xs font-bold text-[#102604] uppercase tracking-wider">{report.studentName}</p>
                        <p className="text-[10px] text-slate-500">LRN: {report.studentLrn} • Grade {report.grade}-{report.section}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Issue / Incident:</p>
                      <button
                        onClick={() => {
                          setSelectedReportForView(report);
                          setRecommendationEdit(report.recommendation);
                          setStatusEdit(report.recordStatus || 'On Going');
                          setMovFile(null);
                          setAdminComment("");
                          setShowDetail(true);
                        }}
                        className="text-xs font-bold text-[#102604] underline text-left mt-0.5 leading-snug"
                      >
                        {report.issue}
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 text-[10px] text-slate-500">
                      <span>Date: {new Date(report.dateReported).toLocaleDateString()}</span>
                      <span>By: {report.reportedBy}</span>
                    </div>

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <button
                        onClick={() => {
                          setSelectedReportForView(report);
                          setRecommendationEdit(report.recommendation);
                          setStatusEdit(report.recordStatus || 'On Going');
                          setMovFile(null);
                          setAdminComment("");
                          setShowDetail(true);
                        }}
                        className="px-3 py-1.5 bg-[#102604] text-white text-[10px] font-bold uppercase tracking-wider rounded"
                      >
                        View Details
                      </button>
                      {userRole === 'Admin' && (
                        <button
                          onClick={() => handleDeleteReport(report)}
                          disabled={isDeleting}
                          className="px-3 py-1.5 bg-red-600 text-white text-[10px] font-bold uppercase tracking-wider rounded"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Tablet / Laptop / Desktop Table View */}
              <div className="hidden sm:block border border-slate-100 overflow-x-auto">
                <table className="w-full border-collapse text-left min-w-[700px]">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100">
                      {userRole === 'Admin' && (
                        <th className="px-4 sm:px-6 py-4 w-10">
                          <button 
                            onClick={toggleSelectAll}
                            className="text-slate-400 hover:text-[#102604] transition-colors"
                          >
                            {selectedReportIds.size === filteredReports.length && filteredReports.length > 0 ? (
                              <CheckSquare size={16} className="text-[#102604]" />
                            ) : (
                              <Square size={16} />
                            )}
                          </button>
                        </th>
                      )}
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Date</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Student Identity</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Issue / Incident</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Type</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 text-center">Status</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500">Reported By</th>
                      <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-500 w-10"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filteredReports.map((report, idx) => (
                      <tr key={`tbl-${report.type}-${report.id}-${idx}`} className="hover:bg-slate-50/50 transition-colors group">
                        {userRole === 'Admin' && (
                          <td className="px-4 sm:px-6 py-4">
                            <button 
                              onClick={() => toggleSelectReport(report)}
                              className="text-slate-400 hover:text-[#102604] transition-colors"
                            >
                              {selectedReportIds.has(`${report.type}-${report.id}`) ? (
                                <CheckSquare size={16} className="text-[#102604]" />
                              ) : (
                                <Square size={16} />
                              )}
                            </button>
                          </td>
                        )}
                        <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
                          <p className="text-[11px] font-bold text-slate-900 tabular-nums">
                            {new Date(report.dateReported).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-3">
                            {report.profilePictureUrl ? (
                              <img 
                                src={getDriveImageUrl(report.profilePictureUrl)} 
                                alt={report.studentName}
                                className="w-8 h-8 rounded-full object-cover cursor-pointer hover:opacity-80 transition-opacity border border-slate-200"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewImage(getDriveImageUrl(report.profilePictureUrl));
                                }}
                                referrerPolicy="no-referrer"
                              />
                            ) : (
                              <div className="w-8 h-8 bg-slate-100 flex items-center justify-center rounded-full shrink-0">
                                <User size={14} className="text-slate-400" />
                              </div>
                            )}
                            <div>
                              <p className="text-[11px] font-bold text-[#102604] uppercase tracking-wider">{report.studentName}</p>
                              <p className="text-[9px] font-medium text-slate-400 tabular-nums">LRN: {report.studentLrn}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <button
                            onClick={() => {
                              setSelectedReportForView(report);
                              setRecommendationEdit(report.recommendation);
                              setStatusEdit(report.recordStatus || 'On Going');
                              setMovFile(null);
                              setAdminComment("");
                              setShowDetail(true);
                            }}
                            className="text-[11px] font-bold text-left text-[#102604] hover:text-[#76DA0D] transition-colors leading-snug underline underline-offset-4 decoration-slate-200"
                          >
                            {report.issue}
                          </button>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                            report.type === 'Critical' 
                              ? 'border-red-100 text-red-600 bg-red-50' 
                              : 'border-blue-100 text-blue-600 bg-blue-50'
                          }`}>
                            {report.type}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4 text-center">
                          <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                            report.recordStatus === 'RESOLVED' 
                              ? 'border-[#76DA0D]/20 text-[#102604] bg-[#76DA0D]/10' 
                              : report?.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'
                          }`}>
                            {report.recordStatus || 'On Going'}
                          </span>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-tighter">{report.reportedBy}</p>
                        </td>
                        <td className="px-4 sm:px-6 py-4">
                          <div className="flex items-center gap-2 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                            <button 
                              onClick={() => {
                                setSelectedReportForView(report);
                                setRecommendationEdit(report.recommendation);
                                setStatusEdit(report.recordStatus || 'On Going');
                                setMovFile(null);
                                setAdminComment("");
                                setShowDetail(true);
                              }}
                              className="p-1 text-slate-400 hover:text-[#102604]"
                              title="View Details"
                            >
                              <ChevronRight size={18} />
                            </button>
                            {userRole === 'Admin' && (
                              <button 
                                onClick={() => handleDeleteReport(report)}
                                disabled={isDeleting}
                                className="p-1 text-slate-400 hover:text-red-600 transition-colors"
                                title="Delete Report"
                              >
                                <Trash2 size={16} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-20">
              <AlertCircle size={32} className="text-slate-200 mb-4" />
              <p className="serif italic text-slate-400 text-lg">No matching records found</p>
              <p className="text-[9px] font-bold uppercase tracking-widest text-slate-300 mt-1">Adjust your filters to broaden your search</p>
            </div>
          )}
        </div>

        <div className="p-4 sm:p-8 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <p className="text-[9px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 text-center sm:text-left">
            Archive synchronized in real-time with server registry
          </p>
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 sm:px-8 py-2.5 sm:py-3 text-[10px] font-black uppercase tracking-[0.2em] sm:tracking-[0.3em] text-[#102604] border border-[#102604] hover:bg-[#102604] hover:text-white transition-all"
          >
            Close Archive
          </button>
        </div>

        {/* Report Detail Overlay */}
        <AnimatePresence>
          {showDetail && selectedReportForView && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-0 sm:p-4 md:p-8 bg-[#102604]/40 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-white w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-3xl shadow-2xl overflow-hidden flex flex-col border border-slate-200 rounded-none sm:rounded-xl"
              >
                <div className="p-4 sm:p-6 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
                  <div>
                    <h4 className="serif font-serif text-lg sm:text-xl text-slate-900">Case Investigation Trace</h4>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 mt-0.5">Registry ID: {selectedReportForView.id}</p>
                  </div>
                  <button onClick={() => setShowDetail(false)} className="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-6 sm:space-y-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Subject Student</label>
                        <p className="text-sm font-bold text-[#102604] uppercase tracking-wide">{selectedReportForView.studentName}</p>
                        <p className="text-[10px] font-medium text-slate-500 tabular-nums">LRN: {selectedReportForView.studentLrn}</p>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Grade Level</label>
                          <p className="text-[11px] font-bold text-slate-700">{selectedReportForView.grade}</p>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Section</label>
                          <p className="text-[11px] font-bold text-slate-700">{selectedReportForView.section}</p>
                        </div>
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-2">Primary Incident</label>
                        <p className="text-sm font-bold text-slate-800 leading-tight">{selectedReportForView.issue}</p>
                        <span className={`inline-block mt-2 text-[8px] font-black uppercase tracking-widest px-2 py-0.5 border ${
                          selectedReportForView.type === 'Critical' ? 'border-red-100 text-red-600 bg-red-50' : 'border-blue-100 text-blue-600 bg-blue-50'
                        }`}>
                          {selectedReportForView.type} Incident
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Incident Date</label>
                          <p className="text-[11px] font-bold text-slate-700">{selectedReportForView.dateOfIncident}</p>
                        </div>
                        <div>
                          <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Incident Time</label>
                          <p className="text-[11px] font-bold text-slate-700">{selectedReportForView.timeOfIncident}</p>
                        </div>
                      </div>
                      <div>
                        <label className="block text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1">Date Reported</label>
                        <p className="text-[11px] font-bold text-slate-700">{selectedReportForView.dateReported}</p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        <FileText size={12} />
                        Case Description
                      </label>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600 leading-relaxed italic">
                        {selectedReportForView.details || "No description provided."}
                      </div>
                    </section>

                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        <ShieldAlert size={12} />
                        Immediate Action Taken
                      </label>
                      <div className="p-4 bg-slate-50 border border-slate-100 rounded text-[11px] text-slate-600 leading-relaxed font-medium">
                        {renderActionTaken(selectedReportForView.actionTaken)}
                      </div>
                    </section>

                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-slate-400 mb-3">
                        <AlertCircle size={12} />
                        Record Status
                      </label>
                      <div className="space-y-4">
                        <div className="flex flex-col gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Current DB Status:</span>
                            <span className={`text-[9px] font-black uppercase tracking-widest px-2.5 py-1 border rounded-sm ${
                              selectedReportForView.recordStatus === 'RESOLVED' 
                                ? 'border-[#76DA0D]/20 text-[#102604] bg-[#76DA0D]/10'
                                : selectedReportForView.recordStatus === 'Pending Approval' ? 'border-blue-200 text-blue-700 bg-blue-50' : 'border-orange-100 text-orange-600 bg-orange-50'
                            }`}>
                              {selectedReportForView.recordStatus || 'On Going'}
                            </span>
                          </div>
                        </div>
                          
                          
                        {!(showOnlyPendingApproval || selectedReportForView.recordStatus === 'Pending Approval') && (userRole === 'Admin' || userRole === 'Guidance' || userRole === 'Adviser' || userRole === 'Department Head') && (
                          <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded space-y-3">
                            <div className="space-y-1">
                              <label className="block text-[9px] font-black uppercase tracking-widest text-slate-700">
                                Upload Means of Verification (MOV) <span className="text-amber-600 font-bold">(Required for Submit for Approval)</span>
                              </label>
                              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-wider">
                                File will be uploaded to Supabase Storage as: <span className="font-mono text-[#102604] lowercase select-all">Report_{selectedReportForView.id}_{selectedReportForView.grade}_{selectedReportForView.section}.[ext]</span>
                              </p>
                            </div>
                            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
                              <input 
                                type="file" 
                                id="mov-file-input"
                                disabled={isUpdating}
                                onChange={(e) => {
                                  if (e.target.files && e.target.files[0]) {
                                    setMovFile(e.target.files[0]);
                                  }
                                }}
                                className="w-full text-[10px] text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:border file:border-slate-300 file:rounded-sm file:font-sans file:font-bold file:text-[9px] file:uppercase file:tracking-wider file:bg-white file:text-slate-700 hover:file:bg-slate-50 cursor-pointer disabled:opacity-50"
                              />
                              {movFile && (
                                <span className="text-[8px] font-black uppercase tracking-widest text-[#102604] bg-[#76DA0D]/10 border border-[#76DA0D]/20 px-2 py-1">
                                  ✓ Selected: {movFile.name}
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </section>

                    <section>
                      <label className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-[#102604] mb-3">
                        <Filter size={12} className="text-[#76DA0D]" />
                        Guidance Recommendations
                        <span className="ml-auto text-[8px] font-bold text-[#76DA0D] animate-pulse">Editable Field</span>
                      </label>
                      <textarea
                        value={recommendationEdit}
                        disabled={isUpdating || isSavingRec}
                        onChange={(e) => setRecommendationEdit(e.target.value)}
                        placeholder="Provide guidance or follow-up recommendations..."
                        className="w-full p-4 bg-white border-2 border-slate-100 text-[11px] text-slate-800 leading-relaxed focus:outline-none focus:border-[#76DA0D] min-h-[120px] transition-colors disabled:opacity-50"
                      />
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 mt-2 min-h-[32px]">
                        <div>
                          {selectedReportForView.lastUpdatedBy && (
                            <p className="text-[9px] font-bold italic text-slate-400 flex items-center gap-1">
                              <Clock size={10} />
                              Last revision signed by: {selectedReportForView.lastUpdatedBy}
                            </p>
                          )}
                        </div>
                        {recommendationEdit !== (selectedReportForView.recommendation || "") && (
                          <button
                            type="button"
                            onClick={handleSaveRecommendation}
                            disabled={isSavingRec}
                            className="w-full sm:w-auto px-4 py-2 bg-[#76DA0D] text-[#102604] font-black text-[10px] uppercase tracking-widest hover:bg-[#68C00B] transition-all rounded shadow-sm flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                          >
                            {isSavingRec ? "Saving..." : "Save Guidance Recommendations"}
                          </button>
                        )}
                      </div>
                    </section>
                  </div>
                </div>

                <div className="p-4 sm:p-6 bg-slate-50 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                  <div className="flex items-center gap-3 w-full sm:w-auto">
                    <div className="w-8 h-8 bg-white border border-slate-200 flex items-center justify-center rounded-full shrink-0">
                      <User size={14} className="text-slate-400" />
                    </div>
                    <div>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Reporting Officer</p>
                      <p className="text-[10px] font-bold text-slate-700">{selectedReportForView.reportedBy}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2 sm:gap-3 w-full sm:w-auto">
                    <button
                      onClick={() => setShowDetail(false)}
                      className="px-4 sm:px-5 py-2.5 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                    >
                      Close
                    </button>
                    
                    {(showOnlyPendingApproval || selectedReportForView.recordStatus === 'Pending Approval') ? (
                      <>
                        <button
                          onClick={handleDisapproveReport}
                          disabled={isUpdating}
                          className="px-4 sm:px-6 py-2.5 bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 disabled:opacity-50 transition-all flex items-center gap-2 justify-center rounded-sm cursor-pointer shadow-xs"
                        >
                          <XCircle size={14} />
                          {isUpdating ? "Processing..." : "Disapproved"}
                        </button>

                        <button
                          onClick={handleApproveReport}
                          disabled={isUpdating}
                          className="px-4 sm:px-6 py-2.5 bg-emerald-700 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-800 disabled:opacity-50 transition-all flex items-center gap-2 justify-center rounded-sm cursor-pointer shadow-xs"
                        >
                          <CheckCircle size={14} />
                          {isUpdating ? "Processing..." : "Approved"}
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={handleSetOngoing}
                          disabled={isUpdating}
                          className="px-4 sm:px-6 py-2.5 bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition-all flex items-center gap-2 justify-center rounded-sm cursor-pointer shadow-xs"
                        >
                          {showOnlyResolved || selectedReportForView.recordStatus === 'RESOLVED' ? "Re-Open Case" : "On Going"}
                        </button>

                        {!(showOnlyResolved || selectedReportForView.recordStatus === 'RESOLVED') && (
                          <button
                            onClick={handleSubmitForApproval}
                            disabled={isUpdating}
                            className="px-4 sm:px-6 py-2.5 bg-[#102604] text-white text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 justify-center rounded-sm cursor-pointer shadow-xs"
                          >
                            {isUpdating ? (
                              <>
                                <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Submitting...
                              </>
                            ) : (
                              "Submit for Approval"
                            )}
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        <AnimatePresence>
          {previewImage && (
            <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center z-[100] p-4" onClick={() => setPreviewImage(null)}>
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="relative max-w-3xl max-h-[90vh]"
                onClick={e => e.stopPropagation()}
              >
                <button
                  onClick={() => setPreviewImage(null)}
                  className="absolute -top-12 right-0 p-2 text-white hover:text-slate-200 transition-colors"
                >
                  <X size={24} />
                </button>
                <img
                  src={previewImage}
                  alt="Student Profile"
                  className="w-full h-auto max-h-[80vh] object-contain rounded shadow-2xl"
                  referrerPolicy="no-referrer"
                />
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
};

export default ReportsViewerModal;
