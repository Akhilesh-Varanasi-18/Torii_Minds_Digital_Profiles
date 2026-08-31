"use client";

import { createContext, useCallback, useContext, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";

type ToastType = "success" | "error" | "info";
interface ToastItem { id: number; message: string; type: ToastType }

const ToastCtx = createContext<(message: string, type?: ToastType) => void>(() => {});
let counter = 0;

const META: Record<ToastType, { color: string; icon: React.ReactNode }> = {
  success: { color: "var(--success)", icon: <path d="M20 6 9 17l-5-5" /> },
  error: { color: "var(--danger)", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 8v5M12 16h.01" /></> },
  info: { color: "var(--primary)", icon: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" /></> },
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, type: ToastType = "info") => {
    const id = ++counter;
    setToasts((t) => [...t, { id, message, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 5000);
  }, []);

  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="pointer-events-none fixed right-3 top-3 z-[100] flex w-[min(92vw,380px)] flex-col gap-2 sm:right-5 sm:top-5">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              layout
              initial={{ opacity: 0, x: 60, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 60, scale: 0.9 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
              className="pointer-events-auto flex items-start gap-3 rounded-xl border p-3.5"
              style={{ background: "var(--surface)", borderColor: "var(--line)", borderLeft: `4px solid ${META[t.type].color}`, boxShadow: "0 12px 40px -12px rgb(var(--shadow-color) / 0.4)" }}
            >
              <span className="mt-0.5 flex-none" style={{ color: META[t.type].color }}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">{META[t.type].icon}</svg>
              </span>
              <p className="flex-1 text-sm leading-snug" style={{ color: "var(--ink)" }}>{t.message}</p>
              <button onClick={() => setToasts((x) => x.filter((i) => i.id !== t.id))} aria-label="Dismiss" className="mt-0.5 flex-none" style={{ color: "var(--muted)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  return useContext(ToastCtx);
}
