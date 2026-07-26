import { useState, useEffect, useCallback, useRef } from "react";
import { UserAccount } from "../types";

interface UseSessionTimeoutOptions {
  user: Partial<UserAccount> | null;
  onLogout: (reason?: string) => void;
  timeoutMinutes: number;
}

export function useSessionTimeout({
  user,
  onLogout,
  timeoutMinutes,
}: UseSessionTimeoutOptions) {
  const [showWarning, setShowWarning] = useState(false);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(0);
  const lastActivityRef = useRef<number>(Date.now());

  // Record user interaction timestamp to local state and localStorage
  const recordActivity = useCallback(() => {
    const now = Date.now();
    // Throttle timestamp updates to once every 3 seconds to avoid heavy storage IO
    if (now - lastActivityRef.current > 3000) {
      lastActivityRef.current = now;
      localStorage.setItem("teacher_portal_last_activity", now.toString());
      if (showWarning) {
        setShowWarning(false);
      }
    }
  }, [showWarning]);

  // Explicitly extend session by resetting activity timer
  const extendSession = useCallback(() => {
    const now = Date.now();
    lastActivityRef.current = now;
    localStorage.setItem("teacher_portal_last_activity", now.toString());
    setShowWarning(false);
  }, []);

  // Sync across multiple browser tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "teacher_portal_last_activity" && e.newValue) {
        const remoteTime = parseInt(e.newValue, 10);
        if (!isNaN(remoteTime)) {
          lastActivityRef.current = remoteTime;
          setShowWarning(false);
        }
      } else if (e.key === "teacher_portal_user" && !e.newValue) {
        onLogout("Logged out from another browser tab.");
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [onLogout]);

  // Event listeners to detect mouse, keyboard, touch or scroll activity
  useEffect(() => {
    if (!user || timeoutMinutes <= 0) return;

    const events = ["mousemove", "mousedown", "keydown", "touchstart", "scroll", "click"];

    const handleUserActivity = () => {
      recordActivity();
    };

    events.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    return () => {
      events.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
    };
  }, [user, timeoutMinutes, recordActivity]);

  // Main countdown timer loop checking idle duration
  useEffect(() => {
    if (!user || timeoutMinutes <= 0) {
      setShowWarning(false);
      return;
    }

    const storedLastActivity = localStorage.getItem("teacher_portal_last_activity");
    if (storedLastActivity) {
      const parsed = parseInt(storedLastActivity, 10);
      if (!isNaN(parsed)) {
        lastActivityRef.current = parsed;
      }
    } else {
      localStorage.setItem("teacher_portal_last_activity", Date.now().toString());
      lastActivityRef.current = Date.now();
    }

    const totalTimeoutMs = timeoutMinutes * 60 * 1000;
    // Show warning when remaining seconds are <= 120s (or half the timeout if timeout < 4 min)
    const warningWindowMs = Math.min(120 * 1000, Math.floor(totalTimeoutMs / 2));

    const interval = setInterval(() => {
      const now = Date.now();
      const elapsedMs = now - lastActivityRef.current;
      const remainingMs = totalTimeoutMs - elapsedMs;
      const remainingSecs = Math.max(0, Math.ceil(remainingMs / 1000));

      if (remainingMs <= 0) {
        setShowWarning(false);
        clearInterval(interval);
        onLogout("Your session has expired due to inactivity for security purposes.");
      } else if (remainingMs <= warningWindowMs) {
        setSecondsRemaining(remainingSecs);
        setShowWarning(true);
      } else {
        setShowWarning(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [user, timeoutMinutes, onLogout]);

  return {
    showWarning,
    secondsRemaining,
    extendSession,
    recordActivity,
  };
}
