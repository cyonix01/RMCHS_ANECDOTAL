/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { createContext, useContext, useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertCircle, CheckCircle2, Info, X, AlertTriangle } from 'lucide-react';

type NotificationType = 'success' | 'error' | 'info' | 'warning';

interface Notification {
  id: string;
  type: NotificationType;
  message: string;
}

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
  variant?: 'danger' | 'primary';
}

interface NotificationContextType {
  notify: (type: NotificationType, message: string) => void;
  confirm: (options: ConfirmOptions) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [confirmModal, setConfirmModal] = useState<ConfirmOptions | null>(null);

  const notify = (type: NotificationType, message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setNotifications((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  };

  const confirm = (options: ConfirmOptions) => {
    setConfirmModal(options);
  };

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  return (
    <NotificationContext.Provider value={{ notify, confirm }}>
      {children}
      
      {/* Toast Notifications */}
      <div className="fixed top-6 right-6 z-[200] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        <AnimatePresence>
          {notifications.map((n) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, x: 50, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 20, scale: 0.95 }}
              className="pointer-events-auto bg-white border border-slate-100 shadow-xl p-4 flex items-start gap-3 rounded-none"
            >
              <div className="mt-0.5">
                {n.type === 'success' && <CheckCircle2 size={18} className="text-[#76DA0D]" />}
                {n.type === 'error' && <AlertCircle size={18} className="text-red-500" />}
                {n.type === 'info' && <Info size={18} className="text-blue-500" />}
                {n.type === 'warning' && <AlertTriangle size={18} className="text-orange-500" />}
              </div>
              <div className="flex-1">
                <p className="text-[11px] font-bold text-[#102604] uppercase tracking-wider leading-tight">
                  {n.message}
                </p>
              </div>
              <button
                onClick={() => removeNotification(n.id)}
                className="text-slate-300 hover:text-slate-500 transition-colors"
              >
                <X size={14} />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {confirmModal && (
          <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-[#102604]/40 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <div className="flex items-center gap-3 mb-4">
                  {confirmModal.variant === 'danger' ? (
                    <div className="w-10 h-10 bg-red-50 flex items-center justify-center">
                      <AlertTriangle size={20} className="text-red-500" />
                    </div>
                  ) : (
                    <div className="w-10 h-10 bg-blue-50 flex items-center justify-center">
                      <Info size={20} className="text-blue-500" />
                    </div>
                  )}
                  <h3 className="serif font-serif text-xl text-slate-900">{confirmModal.title}</h3>
                </div>
                <p className="text-[12px] font-medium text-slate-500 leading-relaxed">
                  {confirmModal.message}
                </p>
              </div>
              <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                <button
                  onClick={() => {
                    confirmModal.onCancel?.();
                    setConfirmModal(null);
                  }}
                  className="px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-slate-500 hover:text-slate-800 transition-colors"
                >
                  {confirmModal.cancelText || 'Cancel'}
                </button>
                <button
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className={`px-6 py-2 text-[10px] font-bold uppercase tracking-widest text-white transition-colors ${
                    confirmModal.variant === 'danger' ? 'bg-red-500 hover:bg-red-600' : 'bg-[#102604] hover:bg-slate-800'
                  }`}
                >
                  {confirmModal.confirmText || 'Confirm'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </NotificationContext.Provider>
  );
};
