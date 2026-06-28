import React, { useEffect, useState, useRef } from "react";
import { Bell, Check, Trash2, AlertTriangle, ShieldAlert, FileText, CheckCheck } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { AppNotification, UserAccount } from "../types";
import { useNotification } from "./NotificationProvider";

interface NotificationBellProps {
  user: Partial<UserAccount>;
  onSelectNotification?: (studentLrn: string) => void;
}

export default function NotificationBell({ user, onSelectNotification }: NotificationBellProps) {
  const { notify } = useNotification();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Poll intervals
  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/notifications");
      if (res.ok) {
        const data = await res.json();
        setNotifications(data);
      }
    } catch (err) {
      console.error("Failed to fetch notifications:", err);
    }
  };

  useEffect(() => {
    fetchNotifications();
    // Poll every 12 seconds for new notifications
    const interval = setInterval(fetchNotifications, 12000);
    return () => clearInterval(interval);
  }, []);

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  // Filter notifications based on role
  const filteredNotifications = notifications.filter(n => {
    if (!user.role) return false;
    // Guidance sees all reports
    if (user.role === 'Guidance') {
      return n.targetRole === 'Guidance' || n.targetRole === 'All';
    }
    // Admin sees critical & CICL
    if (user.role === 'Admin') {
      return n.targetRole === 'Admin' || n.targetRole === 'All';
    }
    // Other roles don't see system notifications unless specified
    return false;
  });

  const unreadCount = filteredNotifications.filter(n => {
    if (!user.email) return false;
    return !n.readBy?.includes(user.email);
  }).length;

  const handleMarkAsRead = async (id: string | number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email })
      });
      if (res.ok) {
        // Optimistically update local state
        setNotifications(prev => prev.map(n => {
          if (String(n.id) === String(id)) {
            const currentReadBy = n.readBy || [];
            if (user.email && !currentReadBy.includes(user.email)) {
              return { ...n, readBy: [...currentReadBy, user.email], isRead: true };
            }
          }
          return n;
        }));
      }
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  };

  const handleNotificationClick = async (notif: AppNotification) => {
    await handleMarkAsRead(notif.id);
    if (notif.studentLrn && onSelectNotification) {
      onSelectNotification(notif.studentLrn);
      setIsOpen(false);
    }
  };

  const getNotificationStyles = (type: 'General' | 'Critical' | 'CICL', isUnread: boolean) => {
    switch (type) {
      case 'General':
        return {
          container: isUnread 
            ? "bg-yellow-50/90 border-l-4 border-yellow-400 hover:bg-yellow-100/60" 
            : "bg-yellow-50/30 border-l-4 border-yellow-300 hover:bg-yellow-100/40",
          text: isUnread ? "text-yellow-950 font-semibold" : "text-yellow-900",
          iconBg: "bg-yellow-100 text-yellow-600",
          badge: "bg-yellow-200/60 text-yellow-800"
        };
      case 'Critical':
        return {
          container: isUnread 
            ? "bg-orange-50/90 border-l-4 border-orange-500 hover:bg-orange-100/60" 
            : "bg-orange-50/30 border-l-4 border-orange-400 hover:bg-orange-100/40",
          text: isUnread ? "text-orange-950 font-semibold" : "text-orange-900",
          iconBg: "bg-orange-100 text-orange-600",
          badge: "bg-orange-200/60 text-orange-800"
        };
      case 'CICL':
        return {
          container: isUnread 
            ? "bg-red-50 border-l-4 border-red-500 hover:bg-red-100/60" 
            : "bg-red-50/40 border-l-4 border-red-400 hover:bg-red-100/40",
          text: isUnread ? "text-red-950 font-semibold" : "text-red-900",
          iconBg: "bg-red-100 text-red-600",
          badge: "bg-red-200/60 text-red-800"
        };
      default:
        return {
          container: "bg-slate-50 hover:bg-slate-100/50",
          text: "text-slate-700",
          iconBg: "bg-slate-100 text-slate-500",
          badge: "bg-slate-100 text-slate-600"
        };
    }
  };

  const handleMarkAllAsRead = async () => {
    if (filteredNotifications.length === 0) return;
    try {
      setLoading(true);
      const res = await fetch("/api/notifications/read-all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: user.email, role: user.role })
      });
      if (res.ok) {
        notify("success", "All notifications marked as read!");
        // Update local state
        setNotifications(prev => prev.map(n => {
          const isTargeted = n.targetRole === user.role || n.targetRole === 'All';
          if (isTargeted && user.email) {
            const currentReadBy = n.readBy || [];
            if (!currentReadBy.includes(user.email)) {
              return { ...n, readBy: [...currentReadBy, user.email], isRead: true };
            }
          }
          return n;
        }));
      }
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm("Are you sure you want to delete all notifications from the system? This action cannot be undone.")) {
      return;
    }
    try {
      setLoading(true);
      const res = await fetch("/api/notifications", {
        method: "DELETE"
      });
      if (res.ok) {
        notify("success", "Notifications cleared successfully!");
        setNotifications([]);
      }
    } catch (err) {
      console.error("Failed to clear notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  // Helper for displaying time
  const formatTime = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return "Just now";
    }
  };

  // Skip rendering bell if user has a role that doesn't receive system notifications
  if (user.role !== 'Admin' && user.role !== 'Guidance') {
    return null;
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative flex items-center justify-center w-10 h-10 border transition-all cursor-pointer rounded-none select-none shadow-sm ${
          isOpen
            ? "bg-[#102604] border-[#102604] text-[#76DA0D]"
            : "bg-white border-slate-200 hover:border-[#76DA0D] hover:bg-slate-50 text-slate-600"
        }`}
        title="Notifications"
        id="notification-bell-btn"
      >
        <Bell size={16} className={unreadCount > 0 ? "animate-swing" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center bg-red-600 text-white font-bold text-[8px] rounded-full border border-white ring-2 ring-transparent">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Box */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 shadow-2xl z-50 flex flex-col font-sans"
            id="notification-dropdown"
          >
            {/* Header */}
            <div className="p-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-1.5">
                <Bell size={14} className="text-[#76DA0D]" />
                <span className="font-bold text-[11px] uppercase tracking-wider text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-[9px] font-bold uppercase tracking-wider">
                    {unreadCount} New
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllAsRead}
                  disabled={loading}
                  className="flex items-center gap-1 text-[9px] font-bold text-[#76DA0D] hover:text-lime-600 uppercase tracking-widest cursor-pointer select-none"
                  title="Mark all as read"
                >
                  <CheckCheck size={11} />
                  <span>Mark All</span>
                </button>
              )}
            </div>

            {/* List Body */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredNotifications.length > 0 ? (
                filteredNotifications.map((notif) => {
                  const isUnread = user.email ? !notif.readBy?.includes(user.email) : false;
                  const styles = getNotificationStyles(notif.type as any, isUnread);
                  return (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-3 flex gap-3 transition-colors cursor-pointer relative items-start ${styles.container}`}
                    >
                      {/* Left Side Status Icon */}
                      <div className="mt-0.5 shrink-0">
                        {notif.type === 'Critical' ? (
                          <div className={`p-1.5 rounded-sm ${styles.iconBg}`}>
                            <ShieldAlert size={12} />
                          </div>
                        ) : notif.type === 'CICL' ? (
                          <div className={`p-1.5 rounded-sm ${styles.iconBg}`}>
                            <AlertTriangle size={12} />
                          </div>
                        ) : (
                          <div className={`p-1.5 rounded-sm ${styles.iconBg}`}>
                            <FileText size={12} />
                          </div>
                        )}
                      </div>

                      {/* Message Content */}
                      <div className="flex-1 min-w-0 space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-1 py-0.5 text-[8px] font-bold uppercase tracking-wider rounded-none ${styles.badge}`}>
                            {notif.type}
                          </span>
                          {isUnread && (
                            <span className="h-1.5 w-1.5 bg-red-600 rounded-full" title="New" />
                          )}
                        </div>
                        <p className={`text-[11px] leading-relaxed break-words ${styles.text}`}>
                          {notif.message}
                        </p>
                        <p className="text-[9px] font-medium opacity-70 font-mono">
                          {formatTime(notif.createdAt)}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="p-6 flex flex-col items-center justify-center text-center space-y-2">
                  <div className="p-3 bg-slate-50 text-slate-400 rounded-full">
                    <Bell size={24} className="stroke-1" />
                  </div>
                  <div className="space-y-0.5">
                    <p className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">All caught up!</p>
                    <p className="text-[10px] text-slate-400 max-w-[200px]">No notifications recorded for your current role.</p>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Clear All button for Admins */}
            {user.role === 'Admin' && filteredNotifications.length > 0 && (
              <div className="p-2 border-t border-slate-100 flex justify-end bg-slate-50/50">
                <button
                  onClick={handleClearAll}
                  disabled={loading}
                  className="flex items-center gap-1.5 text-[9px] font-bold text-red-600 hover:text-red-700 uppercase tracking-widest cursor-pointer select-none"
                  title="Clear all notifications"
                >
                  <Trash2 size={11} />
                  <span>Clear All</span>
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
