import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  X, 
  Search, 
  RefreshCw, 
  Download, 
  ShieldCheck, 
  UserCheck, 
  UserPlus, 
  Trash2, 
  Camera, 
  Users, 
  ChevronDown, 
  ChevronUp, 
  FileText,
  Clock,
  Filter,
  LogIn,
  Key,
  AlertTriangle,
  CheckCircle2,
  Settings,
  FolderPlus,
  Edit3,
  Globe
} from 'lucide-react';
import Swal from 'sweetalert2';
import { AuditLog } from '../types';

interface AuditLogModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AuditLogModal: React.FC<AuditLogModalProps> = ({ isOpen, onClose }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [actionFilter, setActionFilter] = useState<string>('ALL');
  const [expandedLogId, setExpandedLogId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/audit-logs');
      if (response.ok) {
        const data = await response.json();
        setLogs(data);
      } else {
        console.error('Failed to load audit logs from server');
      }
    } catch (err) {
      console.error('Error fetching audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter(log => {
    // Action filter
    if (actionFilter !== 'ALL' && log.action !== actionFilter) {
      return false;
    }
    // Search query filter
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (log.targetName || '').toLowerCase().includes(q) ||
      (log.targetId || '').toLowerCase().includes(q) ||
      (log.performedBy || '').toLowerCase().includes(q) ||
      (log.ipAddress || '').toLowerCase().includes(q) ||
      (log.details || '').toLowerCase().includes(q) ||
      (log.action || '').toLowerCase().includes(q)
    );
  });

  const exportToCSV = () => {
    if (filteredLogs.length === 0) {
      Swal.fire({
        icon: 'info',
        title: 'No Data to Export',
        text: 'There are no audit log records matching your current search/filter.',
        confirmButtonColor: '#102604'
      });
      return;
    }

    const headers = ['ID', 'Timestamp', 'Action', 'Target Name', 'Target ID', 'Performed By', 'IP Address', 'Details'];
    const rows = filteredLogs.map(log => [
      `"${log.id}"`,
      `"${new Date(log.timestamp).toLocaleString()}"`,
      `"${log.action}"`,
      `"${(log.targetName || '').replace(/"/g, '""')}"`,
      `"${(log.targetId || '').replace(/"/g, '""')}"`,
      `"${(log.performedBy || '').replace(/"/g, '""')}"`,
      `"${(log.ipAddress || '').replace(/"/g, '""')}"`,
      `"${(log.details || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Audit_Log_Export_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    Swal.fire({
      icon: 'success',
      title: 'Export Complete',
      text: `Successfully exported ${filteredLogs.length} audit trail entries to CSV.`,
      toast: true,
      position: 'top-end',
      showConfirmButton: false,
      timer: 3000
    });
  };

  const getActionBadge = (action: AuditLog['action']) => {
    switch (action) {
      case 'USER_LOGIN':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
            <LogIn size={12} /> USER LOGIN
          </span>
        );
      case 'UPDATE_TEACHER_PROFILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
            <UserCheck size={12} /> TEACHER UPDATE
          </span>
        );
      case 'UPDATE_STUDENT_PROFILE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <ShieldCheck size={12} /> STUDENT UPDATE
          </span>
        );
      case 'REGISTER_STUDENT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-teal-50 text-teal-700 border border-teal-200">
            <UserPlus size={12} /> STUDENT REGISTER
          </span>
        );
      case 'REGISTER_TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <UserPlus size={12} /> TEACHER REGISTER
          </span>
        );
      case 'ASSIGN_ADVISORY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Users size={12} /> ADVISORY ASSIGN
          </span>
        );
      case 'DELETE_TEACHER':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-50 text-red-700 border border-red-200">
            <Trash2 size={12} /> TEACHER DELETE
          </span>
        );
      case 'UPDATE_STUDENT_PHOTO':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Camera size={12} /> PHOTO UPDATE
          </span>
        );
      case 'BULK_REGISTER_STUDENTS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-cyan-50 text-cyan-700 border border-cyan-200">
            <Users size={12} /> BULK IMPORT
          </span>
        );
      case 'CREATE_REPORT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-orange-50 text-orange-700 border border-orange-200">
            <FileText size={12} /> INCIDENT REPORT
          </span>
        );
      case 'CREATE_CRITICAL_REPORT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <AlertTriangle size={12} /> CRITICAL REPORT
          </span>
        );
      case 'UPDATE_REPORT_STATUS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-lime-50 text-lime-800 border border-lime-200">
            <CheckCircle2 size={12} /> STATUS CHANGE
          </span>
        );
      case 'UPDATE_RECOMMENDATION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
            <Edit3 size={12} /> RECOMMENDATION
          </span>
        );
      case 'DELETE_REPORT':
      case 'DELETE_CRITICAL_REPORT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <Trash2 size={12} /> REPORT DELETE
          </span>
        );
      case 'RESET_PASSWORD':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-yellow-50 text-yellow-800 border border-yellow-200">
            <Key size={12} /> PASSWORD RESET
          </span>
        );
      case 'UPDATE_SIGNATORY_SETTINGS':
      case 'UPDATE_ADMIN_PASSWORDS':
      case 'CONFIGURE_DATABASE':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-300">
            <Settings size={12} /> SETTINGS UPDATE
          </span>
        );
      case 'CREATE_SECTION':
      case 'UPDATE_SECTION':
      case 'DELETE_SECTION':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <FolderPlus size={12} /> SECTION MGMT
          </span>
        );
      case 'CLEAR_ALL_REPORTS':
      case 'CLEAR_ALL_STUDENTS':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-red-100 text-red-800 border border-red-300">
            <Trash2 size={12} /> SYSTEM RESET
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <FileText size={12} /> {action}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="relative w-full max-w-5xl max-h-[90vh] bg-white rounded-xl shadow-2xl flex flex-col overflow-hidden border border-slate-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-[#102604] text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#76DA0D]/20 text-[#76DA0D] rounded-lg border border-[#76DA0D]/30">
              <ShieldCheck size={22} />
            </div>
            <div>
              <h2 className="text-base font-bold tracking-wide uppercase">Admin Audit Log System</h2>
              <p className="text-xs text-slate-300">Comprehensive data integrity audit trail for all portal activities & user actions</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Controls Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[280px]">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search teacher name, activity description, target, LRN, or IP..."
              className="w-full pl-9 pr-16 py-2 text-xs bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102604] focus:border-transparent shadow-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 px-1.5 py-0.5 rounded transition-colors cursor-pointer"
              >
                Clear
              </button>
            )}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <Filter size={14} className="text-slate-500" />
            <select
              value={actionFilter}
              onChange={(e) => setActionFilter(e.target.value)}
              className="text-xs py-2 px-3 bg-white border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#102604] cursor-pointer font-medium text-slate-700 max-w-[220px]"
            >
              <option value="ALL">All Event Types ({logs.length})</option>
              <option value="USER_LOGIN">User Logins</option>
              <option value="UPDATE_TEACHER_PROFILE">Teacher Profile Updates</option>
              <option value="UPDATE_STUDENT_PROFILE">Student Profile Updates</option>
              <option value="REGISTER_STUDENT">Student Registrations</option>
              <option value="REGISTER_TEACHER">Teacher Registrations</option>
              <option value="ASSIGN_ADVISORY">Advisory Assignments</option>
              <option value="DELETE_TEACHER">Teacher Deletions</option>
              <option value="UPDATE_STUDENT_PHOTO">Student Photo Updates</option>
              <option value="BULK_REGISTER_STUDENTS">Bulk Imports</option>
              <option value="CREATE_REPORT">General Reports</option>
              <option value="CREATE_CRITICAL_REPORT">Critical Reports</option>
              <option value="UPDATE_REPORT_STATUS">Status Updates</option>
              <option value="UPDATE_RECOMMENDATION">Recommendations</option>
              <option value="RESET_PASSWORD">Password Resets</option>
              <option value="UPDATE_SIGNATORY_SETTINGS">Signatory Settings</option>
              <option value="UPDATE_ADMIN_PASSWORDS">Admin Passwords</option>
              <option value="CONFIGURE_DATABASE">Database Configs</option>
            </select>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer disabled:opacity-50"
              title="Refresh logs"
            >
              <RefreshCw size={14} className={loading ? "animate-spin text-[#102604]" : ""} />
              <span>Refresh</span>
            </button>

            <button
              onClick={exportToCSV}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-white bg-[#102604] hover:bg-[#1a3a06] rounded-lg transition-colors cursor-pointer shadow-sm"
              title="Export filtered log trail to CSV"
            >
              <Download size={14} className="text-[#76DA0D]" />
              <span>Export CSV</span>
            </button>
          </div>
        </div>

        {/* Logs Table Area */}
        <div className="flex-1 overflow-y-auto p-4 bg-slate-100/50">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <RefreshCw size={28} className="animate-spin text-[#102604] mb-3" />
              <p className="text-xs font-semibold">Loading audit trail records...</p>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-400 bg-white rounded-lg border border-slate-200 p-6 space-y-2">
              <Clock size={36} className="text-slate-300" />
              <div>
                <p className="text-sm font-bold text-slate-600">No Audit Log Entries Found</p>
                <p className="text-xs text-slate-400 mt-1 max-w-sm">
                  {searchQuery || actionFilter !== 'ALL' 
                    ? 'No activity matches your active search or filter criteria.'
                    : 'Portal activities and user actions will automatically be recorded here.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                    <th className="py-3 px-4">Date & Time</th>
                    <th className="py-3 px-4">Event Type</th>
                    <th className="py-3 px-4">Target Name & ID</th>
                    <th className="py-3 px-4">Performed By</th>
                    <th className="py-3 px-4">Details</th>
                    <th className="py-3 px-3 text-center">View Diff</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredLogs.map((log) => {
                    const isExpanded = expandedLogId === log.id;
                    const hasDiff = !!(log.previousValues || log.newValues);

                    return (
                      <React.Fragment key={log.id}>
                        <tr className="hover:bg-slate-50 transition-colors group">
                          {/* Timestamp */}
                          <td className="py-3 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(log.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}{' '}
                            <span className="text-slate-400">
                              {new Date(log.timestamp).toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit'
                              })}
                            </span>
                          </td>

                          {/* Event Type Badge */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {getActionBadge(log.action)}
                          </td>

                          {/* Target */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-slate-800">{log.targetName || 'N/A'}</div>
                            {log.targetId && <div className="text-[10px] text-slate-400 font-mono">{log.targetId}</div>}
                          </td>

                          {/* Performed By & IP Address */}
                          <td className="py-3 px-4 text-slate-600 font-medium">
                            <div>{log.performedBy || 'System / Admin'}</div>
                            {log.ipAddress && (
                              <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1 mt-0.5" title={`Originating IP: ${log.ipAddress}`}>
                                <Globe size={10} className="text-slate-400 shrink-0" />
                                <span>{log.ipAddress}</span>
                              </div>
                            )}
                          </td>

                          {/* Details */}
                          <td className="py-3 px-4 text-slate-600 max-w-xs truncate" title={log.details}>
                            {log.details}
                          </td>

                          {/* Action toggle for Diff */}
                          <td className="py-3 px-3 text-center">
                            {hasDiff ? (
                              <button
                                onClick={() => setExpandedLogId(isExpanded ? null : log.id)}
                                className={`p-1 rounded transition-colors cursor-pointer ${
                                  isExpanded ? 'bg-[#102604] text-white' : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                }`}
                                title="Toggle Field Changes Diff"
                              >
                                {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                              </button>
                            ) : (
                              <span className="text-slate-300 text-[10px]">—</span>
                            )}
                          </td>
                        </tr>

                        {/* Collapsible Diff / Field Details Row */}
                        {isExpanded && hasDiff && (
                          <tr className="bg-slate-50/80 border-t border-b border-slate-200">
                            <td colSpan={6} className="p-4">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono bg-white p-3 rounded-lg border border-slate-200 shadow-inner">
                                {log.previousValues && (
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-1 flex items-center gap-1">
                                      <span>Previous State</span>
                                    </div>
                                    <pre className="p-2 bg-red-50/50 border border-red-100 rounded text-[11px] text-red-900 overflow-x-auto whitespace-pre-wrap">
                                      {JSON.stringify(log.previousValues, null, 2)}
                                    </pre>
                                  </div>
                                )}
                                {log.newValues && (
                                  <div>
                                    <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 mb-1 flex items-center gap-1">
                                      <span>New State</span>
                                    </div>
                                    <pre className="p-2 bg-emerald-50/50 border border-emerald-100 rounded text-[11px] text-emerald-900 overflow-x-auto whitespace-pre-wrap">
                                      {JSON.stringify(log.newValues, null, 2)}
                                    </pre>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-white border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing <span className="font-bold text-slate-800">{filteredLogs.length}</span> of{' '}
            <span className="font-bold text-slate-800">{logs.length}</span> recorded log entries
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};

