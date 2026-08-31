"use client";

import { useState, useRef, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ORG_LIST } from "@/lib/themes";
import { useTheme } from "./ThemeProvider";

function SunIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
    </svg>
  );
}
function MoonIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
    </svg>
  );
}

export function ThemeSwitcher() {
  const { org, mode, setOrg, toggleMode } = useTheme();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  return (
    <div ref={ref} className="relative flex items-center gap-2">
      {/* Light / dark toggle */}
      <button
        onClick={toggleMode}
        aria-label={`Switch to ${mode === "light" ? "dark" : "light"} mode`}
        className="grid h-9 w-9 place-items-center rounded-full border transition-colors hover:border-primary hover:text-primary"
        style={{ color: "var(--ink)" }}
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.span
            key={mode}
            initial={{ rotate: -40, opacity: 0, scale: 0.6 }}
            animate={{ rotate: 0, opacity: 1, scale: 1 }}
            exit={{ rotate: 40, opacity: 0, scale: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            {mode === "light" ? <MoonIcon /> : <SunIcon />}
          </motion.span>
        </AnimatePresence>
      </button>

      {/* Org selector */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-2 rounded-full border py-1.5 pl-2 pr-3 text-sm font-semibold transition-colors hover:border-primary"
        style={{ color: "var(--ink)" }}
      >
        <span
          className="h-3.5 w-3.5 rounded-full ring-2 ring-white/40"
          style={{ background: ORG_LIST.find((o) => o.id === org)?.swatch }}
        />
        <span className="hidden sm:inline">Theme</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
            className="card absolute right-0 top-12 z-50 w-64 p-3"
          >
            <p className="label mb-2 px-1">Organization</p>
            <div className="flex flex-col gap-1">
              {ORG_LIST.map((o) => {
                const active = o.id === org;
                return (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOrg(o.id);
                      setOpen(false);
                    }}
                    className="flex items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors"
                    style={{
                      background: active ? "var(--tint)" : "transparent",
                    }}
                  >
                    <span
                      className="grid h-8 w-8 flex-none place-items-center rounded-lg"
                      style={{ background: o.swatch }}
                    >
                      <span className="h-3 w-3 rounded-full bg-white/85" />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>
                        {o.name}
                      </span>
                      <span className="block truncate text-xs" style={{ color: "var(--muted)" }}>
                        {o.tagline}
                      </span>
                    </span>
                    {active && (
                      <svg className="ml-auto flex-none text-primary" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 px-1 text-[11px] leading-relaxed" style={{ color: "var(--muted)" }}>
              Each org has its own palette in light &amp; dark — six themes in all.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
