"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { useToast } from "@/components/Toast";

export function DownloadMenu({ code }: { code: string }) {
  const { org, mode } = useTheme();
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<null | "pdf" | "html">(null);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  async function download(format: "pdf" | "html") {
    setBusy(format);
    setOpen(false);
    toast(format === "pdf" ? "Preparing your PDF… this can take a few seconds." : "Preparing your HTML…", "info");
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(code)}/export?format=${format}&org=${org}&mode=${mode}`);
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      const href = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = href;
      a.download = `${code}_Portfolio.${format}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(href), 30000);
      toast(`${format.toUpperCase()} downloaded.`, "success");
    } catch {
      toast(`Couldn't generate the ${format.toUpperCase()}. Please try again.`, "error");
    } finally {
      setBusy(null);
    }
  }

  const items: { fmt: "pdf" | "html"; title: string; desc: string; icon: React.ReactNode }[] = [
    { fmt: "pdf", title: "PDF", desc: "Same layout, links clickable", icon: <><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M9 15h6M9 18h4" /></> },
    { fmt: "html", title: "HTML", desc: "Shareable web page", icon: <><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></> },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        disabled={!!busy}
        className="flex items-center gap-2 rounded-full border py-1.5 pl-3 pr-2.5 text-sm font-semibold transition-colors hover:border-primary disabled:opacity-60"
        style={{ color: "var(--ink)" }}
      >
        {busy ? (
          <svg className="animate-spin" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-6.2-8.5" /></svg>
        ) : (
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
        )}
        <span className="hidden sm:inline">{busy ? "Preparing…" : "Download"}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" className={`transition-transform ${open ? "rotate-180" : ""}`}><path d="m6 9 6 6 6-6" /></svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.97 }}
            transition={{ duration: 0.16 }}
            className="card absolute right-0 top-12 z-50 w-64 p-2"
          >
            {items.map((it) => (
              <button
                key={it.fmt}
                onClick={() => download(it.fmt)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--surface-2)]"
              >
                <span className="grid h-9 w-9 flex-none place-items-center rounded-lg" style={{ background: "var(--tint)", color: "var(--primary)" }}>
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{it.icon}</svg>
                </span>
                <span>
                  <span className="block text-sm font-semibold" style={{ color: "var(--ink)" }}>Download as {it.title}</span>
                  <span className="block text-xs" style={{ color: "var(--muted)" }}>{it.desc}</span>
                </span>
              </button>
            ))}
            <p className="px-3 pb-1 pt-1.5 text-[11px] leading-snug" style={{ color: "var(--muted)" }}>
              Exports the current theme you&apos;re viewing.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
