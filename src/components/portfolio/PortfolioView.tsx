"use client";

import { createContext, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useInView } from "framer-motion";
import { useTheme } from "@/components/ThemeProvider";
import { PLATFORM_META } from "@/lib/coding";
import { openFileNewTab } from "@/lib/openFile";
import {
  SECTION_META,
  ensureSections,
  type Credential,
  type CodingProfile,
  type Portfolio,
  type SectionId,
} from "@/types/portfolio";

/* ------------------------------------------------------------------ *
 * Portfolio rendered in the "resume" visual language (card sections,
 * accent bar, section-icon badges, pills, stat boxes) — driven fully
 * by the active theme tokens so all six themes work.
 * ------------------------------------------------------------------ */

function isImageUrl(u?: string): boolean {
  if (!u) return false;
  return u.startsWith("data:image") || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u);
}
function credPreview(c: { certificateThumb?: string; certificateUrl?: string }) {
  return c.certificateThumb || (isImageUrl(c.certificateUrl) ? c.certificateUrl : undefined);
}

// Static mode = exporting to PDF/HTML: render everything visible, no scroll
// reveals (otherwise below-the-fold content would be hidden in the capture).
const StaticCtx = createContext(false);

// ------------------------------- reveal -------------------------------
function Reveal({ children, i = 0 }: { children: React.ReactNode; i?: number }) {
  const isStatic = useContext(StaticCtx);
  if (isStatic) return <>{children}</>;
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.15 }}
      transition={{ duration: 0.5, delay: i * 0.05, ease: [0.23, 1, 0.32, 1] }}
    >
      {children}
    </motion.div>
  );
}

// ------------------------------- icons -------------------------------
const IC = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
function SectionIcon({ id }: { id: SectionId }) {
  switch (id) {
    case "profile": return <svg {...IC}><circle cx="12" cy="8" r="4" /><path d="M4 21v-1a6 6 0 0 1 12 0v1" /></svg>;
    case "coding": return <svg {...IC}><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
    case "tech": return <svg {...IC}><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M9 9h6v6H9z" /></svg>;
    case "ai": return <svg {...IC}><path d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3z" /></svg>;
    case "projects": return <svg {...IC}><path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>;
    case "achievements": return <svg {...IC}><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></svg>;
  }
}
function SocialIcon({ platform }: { platform: string }) {
  const p = platform.toLowerCase();
  const c = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "currentColor" };
  if (p.includes("linkedin")) return <svg {...c}><path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.55V9h3.57v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.72v20.56C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.72V1.72C24 .77 23.2 0 22.22 0z" /></svg>;
  if (p.includes("github")) return <svg {...c}><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.6-1.4-1.4-1.8-1.4-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.3-3.1-.2-.4-.6-1.6 0-3.2 0 0 1-.3 3.4 1.2a11.5 11.5 0 0 1 6 0c2.3-1.5 3.3-1.2 3.3-1.2.6 1.6.2 2.8 0 3.2.9.8 1.3 1.9 1.3 3.1 0 4.6-2.8 5.6-5.5 5.9.5.4.9 1.1.9 2.3v3.3c0 .3.1.7.8.6A12 12 0 0 0 12 .3z" /></svg>;
  if (p.includes("twitter") || p === "x") return <svg {...c}><path d="M18.9 1.2h3.7l-8 9.1 9.4 12.5h-7.4l-5.8-7.6-6.6 7.6H.5l8.5-9.8L0 1.2h7.6l5.2 6.9 6.1-6.9zm-1.3 19.5h2L6.5 3.3H4.4l13.2 17.4z" /></svg>;
  if (p.includes("instagram")) return <svg {...c}><path d="M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.3 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.3 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.3-2.2-.4a3.7 3.7 0 0 1-1.4-.9 3.7 3.7 0 0 1-.9-1.4c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.3-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2zm0 3.2A6.6 6.6 0 1 0 12 18.6 6.6 6.6 0 0 0 12 5.4zm0 10.9a4.3 4.3 0 1 1 0-8.6 4.3 4.3 0 0 1 0 8.6zm6.9-11.1a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0z" /></svg>;
  return <svg {...c} fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" /></svg>;
}

// ------------------------------- shells -------------------------------
function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`rounded-2xl border p-5 sm:p-6 ${className}`}
      style={{ background: "var(--surface)", borderColor: "var(--line)", boxShadow: "0 4px 20px -8px rgb(var(--shadow-color) / 0.14)" }}
    >
      {children}
    </div>
  );
}
function SectionCard({ id, title, children }: { id: SectionId; title: string; children: React.ReactNode }) {
  return (
    <Card>
      <div className="mb-4 flex items-center gap-3">
        <span
          className="grid h-8 w-8 flex-none place-items-center rounded-full text-white"
          style={{ background: "var(--primary)", boxShadow: "0 2px 6px rgb(var(--glow-color) / 0.4)" }}
        >
          <SectionIcon id={id} />
        </span>
        <h2 className="text-sm font-extrabold uppercase tracking-wide" style={{ color: "var(--ink)" }}>{title}</h2>
      </div>
      {children}
    </Card>
  );
}

// ------------------------------- header (profile) -------------------------------
function HeaderCard({ p }: { p: Portfolio }) {
  const pr = p.profile;
  const [photoOpen, setPhotoOpen] = useState(false);

  useEffect(() => {
    if (!photoOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setPhotoOpen(false); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [photoOpen]);

  return (
    <div
      className="relative overflow-hidden rounded-2xl border p-5 sm:p-6"
      style={{ background: "var(--surface)", borderColor: "var(--line)", boxShadow: "0 4px 20px -8px rgb(var(--shadow-color) / 0.14)" }}
    >
      <span className="absolute left-0 top-0 h-full w-[5px]" style={{ background: "var(--primary)" }} />
      <div className="flex flex-col items-center gap-5 pl-2 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          {pr.photoUrl ? (
            <button
              type="button"
              onClick={() => setPhotoOpen(true)}
              aria-label="View profile photo"
              className="group relative h-[90px] w-[90px] flex-none overflow-hidden rounded-full ring-4 ring-white/70 transition-transform hover:scale-[1.04]"
              style={{ background: "var(--surface-2)", boxShadow: "0 4px 12px rgb(var(--shadow-color) / 0.18)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pr.photoUrl} alt={p.name} className="h-full w-full object-cover" />
              <span className="absolute inset-0 flex items-center justify-center bg-black/35 text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3M11 8v6M8 11h6" /></svg>
              </span>
            </button>
          ) : (
            <div className="h-[90px] w-[90px] flex-none overflow-hidden rounded-full ring-4 ring-white/70" style={{ background: "var(--surface-2)", boxShadow: "0 4px 12px rgb(var(--shadow-color) / 0.18)" }}>
              <span className="grid h-full w-full place-items-center text-3xl font-extrabold text-white" style={{ background: "var(--gradient)" }}>{p.name.charAt(0).toUpperCase()}</span>
            </div>
          )}
          <div>
            <h1 className="text-2xl font-extrabold leading-tight tracking-tight sm:text-[26px]" style={{ color: "var(--ink)" }}>{p.name}</h1>
            {pr.headline && <p className="mt-0.5 text-base font-bold" style={{ color: "var(--primary)" }}>{pr.headline}</p>}
            {pr.tagline && <p className="mt-1 text-sm" style={{ color: "var(--body)" }}>{pr.tagline}</p>}
            <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs font-medium sm:justify-start" style={{ color: "var(--muted)" }}>
              {pr.location && <span className="inline-flex items-center gap-1">📍 {pr.location}</span>}
              {pr.email && <a href={`mailto:${pr.email}`} className="inline-flex items-center gap-1 hover:text-primary">✉ {pr.email}</a>}
              {pr.phone && <span className="inline-flex items-center gap-1">☎ {pr.phone}</span>}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-start justify-center gap-3 md:max-w-[340px] md:justify-end">
          {pr.socials?.filter((s) => s.url).map((s) => (
            <a key={s.id} href={s.url} target="_blank" rel="noopener noreferrer" className="group flex flex-col items-center gap-1 text-[11px] font-semibold transition-transform hover:-translate-y-0.5" style={{ color: "var(--ink)" }}>
              <span className="grid h-8 w-8 place-items-center rounded-md border" style={{ background: "var(--surface)", borderColor: "var(--line)" }}>
                <SocialIcon platform={s.platform} />
              </span>
              <span>{s.platform}</span>
              <span className="h-0.5 w-3.5 rounded" style={{ background: "var(--primary)" }} />
            </a>
          ))}
          {pr.resumeUrl && (
            <a
              href={pr.resumeUrl}
              onClick={(e) => { if (pr.resumeUrl!.startsWith("data:")) { e.preventDefault(); openFileNewTab(pr.resumeUrl); } }}
              target="_blank"
              rel="noopener noreferrer"
              className="btn btn-primary self-center text-xs"
            >
              Resume
            </a>
          )}
        </div>
      </div>

      {/* circular photo lightbox */}
      <AnimatePresence>
        {photoOpen && pr.photoUrl && (
          <motion.div
            className="fixed inset-0 z-[70] flex items-center justify-center p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPhotoOpen(false)}
          >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />
            <motion.div
              className="relative overflow-hidden rounded-full border-4 shadow-2xl"
              style={{ width: "min(82vw, 78vh, 440px)", height: "min(82vw, 78vh, 440px)", borderColor: "var(--surface)" }}
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.4, opacity: 0 }}
              transition={{ type: "spring", stiffness: 240, damping: 22 }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={pr.photoUrl} alt={p.name} className="h-full w-full object-cover" />
            </motion.div>
            <motion.button
              type="button"
              onClick={() => setPhotoOpen(false)}
              aria-label="Close"
              className="absolute right-5 top-5 grid h-11 w-11 place-items-center rounded-full text-white"
              style={{ background: "rgba(255,255,255,0.14)" }}
              initial={{ opacity: 0, rotate: -90 }}
              animate={{ opacity: 1, rotate: 0 }}
              exit={{ opacity: 0 }}
              transition={{ delay: 0.1 }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProfileSection({ p }: { p: Portfolio }) {
  return (
    <div className="flex flex-col gap-4">
      <HeaderCard p={p} />
      {p.profile.bio && (
        <SectionCard id="profile" title="Profile Summary">
          <p className="text-sm leading-relaxed" style={{ color: "var(--body)" }}>{p.profile.bio}</p>
        </SectionCard>
      )}
    </div>
  );
}

// ------------------------------- coding -------------------------------
function findStat(cp: CodingProfile, re: RegExp) {
  const s = cp.stats.find((x) => re.test(x.label));
  return s ? Number(String(s.value).replace(/[^\d.]/g, "")) : 0;
}

/** Animated count-up for plain integer values (with #, commas, +, % handled). */
function StatValue({ value, className, style }: { value: string | number; className?: string; style?: React.CSSProperties }) {
  const isStatic = useContext(StaticCtx);
  const raw = String(value);
  const m = raw.match(/^(#?)([\d,]+)(\+|%)?$/);
  const countable = !!m;
  const target = m ? parseInt(m[2].replace(/,/g, ""), 10) : 0;
  const prefix = m?.[1] ?? "";
  const suffix = m?.[3] ?? "";
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.6 });
  // In static/export mode scripts are stripped (no hydration), so start at the
  // final value — otherwise the count-up never runs and every stat reads 0.
  const [n, setN] = useState(isStatic ? target : 0);
  // Depend only on primitives so the tween runs once (not on every render).
  useEffect(() => {
    if (!countable || !inView || isStatic) return;
    const controls = animate(0, target, {
      duration: 1.1,
      ease: [0.23, 1, 0.32, 1],
      onUpdate: (v) => setN(Math.round(v)),
    });
    return () => controls.stop();
  }, [inView, target, countable, isStatic]);
  if (!countable) return <span ref={ref} className={className} style={style}>{raw}</span>;
  return (
    <span ref={ref} className={className} style={style}>
      {prefix}{n.toLocaleString("en-US")}{suffix}
    </span>
  );
}

const DIFF = [
  { key: /easy/i, label: "Easy", color: "#22c55e" },
  { key: /medium/i, label: "Medium", color: "#eab308" },
  { key: /hard/i, label: "Hard", color: "#ef4444" },
];

function DiffMeter({ cp }: { cp: CodingProfile }) {
  const vals = DIFF.map((d) => ({ ...d, v: findStat(cp, d.key) }));
  const total = vals.reduce((a, b) => a + b.v, 0);
  if (total === 0) return null;
  return (
    <div className="mt-4">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface-2)" }}>
        {vals.map((d) => (
          <motion.div
            key={d.label}
            initial={{ width: 0 }}
            whileInView={{ width: `${(d.v / total) * 100}%` }}
            viewport={{ once: true }}
            transition={{ duration: 0.9, ease: [0.23, 1, 0.32, 1] }}
            style={{ background: d.color }}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
        {vals.map((d) => (
          <span key={d.label} className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--body)" }}>
            <span className="h-2 w-2 rounded-full" style={{ background: d.color }} />
            {d.label} <b style={{ color: "var(--ink)" }}>{d.v}</b>
          </span>
        ))}
      </div>
    </div>
  );
}

function CodingCard({ cp }: { cp: CodingProfile }) {
  const meta = PLATFORM_META[cp.platform];
  const isDiff = (l: string) => DIFF.some((d) => d.key.test(l) && /^(easy|medium|hard)$/i.test(l));
  const rest = cp.stats.filter((s) => !isDiff(s.label));
  // headline = solved → repos → rating → first
  const headline =
    rest.find((s) => /solved/i.test(s.label)) ||
    rest.find((s) => /repos/i.test(s.label)) ||
    rest.find((s) => s.kind === "rating") ||
    rest[0];
  const supportingAll = rest.filter((s) => s !== headline);
  const isLong = (s: { value: string | number }) => String(s.value).length > 10;
  const supporting = supportingAll.filter((s) => !isLong(s)).slice(0, 6);
  const longStats = supportingAll.filter(isLong).slice(0, 2);

  return (
    <div className="pf-card group relative flex flex-col overflow-hidden rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      {/* brand glow */}
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full opacity-[0.18] blur-2xl transition-opacity duration-300 group-hover:opacity-30" style={{ background: meta.color }} />

      {/* identity */}
      <div className="relative flex items-center gap-3">
        <span className="grid h-10 w-10 flex-none place-items-center rounded-xl text-base font-extrabold text-white" style={{ background: meta.color, boxShadow: `0 6px 16px -6px ${meta.color}` }}>{meta.name.charAt(0)}</span>
        <div className="min-w-0 flex-1">
          <p className="font-extrabold leading-tight" style={{ color: "var(--ink)" }}>{meta.name}</p>
          {cp.username && <p className="truncate text-xs" style={{ color: "var(--muted)" }}>@{cp.username}</p>}
        </div>
        <a href={cp.profileUrl} target="_blank" rel="noopener noreferrer" aria-label={`Open ${meta.name} profile`} className="grid h-8 w-8 flex-none place-items-center rounded-full border transition-colors" style={{ borderColor: "var(--line)", color: meta.color }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
        </a>
      </div>

      {/* headline stat */}
      {headline && (
        <div className="relative mt-4">
          <StatValue value={headline.value} className="font-mono text-4xl font-extrabold leading-none tracking-tight" style={{ color: "var(--ink)" }} />
          <p className="mt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: meta.color }}>{headline.label}</p>
        </div>
      )}

      {/* supporting stats */}
      {supporting.length > 0 && (
        <div className="relative mt-4 grid grid-cols-3 gap-x-3 gap-y-3 border-t pt-4" style={{ borderColor: "var(--line)" }}>
          {supporting.map((s, i) => (
            <div key={i} className="min-w-0">
              <StatValue value={s.value} className="block truncate font-mono text-base font-extrabold leading-tight" style={{ color: s.kind === "rating" || s.kind === "rank" ? "var(--primary)" : "var(--ink)" }} />
              <p className="mt-0.5 truncate text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* long text stats (e.g. Top Languages) — full width */}
      {longStats.map((s, i) => (
        <div key={i} className="relative mt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>{s.label}</p>
          <p className="mt-0.5 text-sm font-bold leading-snug" style={{ color: "var(--ink)" }}>{s.value}</p>
        </div>
      ))}

      {/* difficulty meter */}
      <DiffMeter cp={cp} />

      {/* profile link */}
      <a
        href={cp.profileUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="relative mt-5 flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-bold transition-all hover:-translate-y-0.5"
        style={{ borderColor: "var(--line)", color: "var(--ink)" }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = meta.color; e.currentTarget.style.color = meta.color; }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--line)"; e.currentTarget.style.color = "var(--ink)"; }}
      >
        View {meta.name} profile →
      </a>
    </div>
  );
}

function CodingSection({ p }: { p: Portfolio }) {
  return (
    <SectionCard id="coding" title="Coding & Problem Solving">
      <div className="grid gap-4 sm:grid-cols-2">
        {p.codingProfiles.map((cp) => <CodingCard key={cp.id} cp={cp} />)}
      </div>
    </SectionCard>
  );
}

// ------------------------- tech & AI (clean chips + certificate showcase) -------------------------
function SkillChip({ c, variant }: { c: Credential; variant: "tech" | "ai" }) {
  const certified = !!(c.certificateUrl || c.verificationId || c.certification);
  const style: React.CSSProperties = variant === "ai"
    ? { background: "var(--tint)", borderColor: certified ? "var(--primary)" : "color-mix(in srgb, var(--primary) 25%, var(--line))", color: "var(--ink)" }
    : { background: "var(--surface-2)", borderColor: certified ? "var(--primary)" : "var(--line)", color: "var(--ink)" };
  return (
    <span
      title={c.certification || c.issuer || c.name}
      className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-semibold transition-transform hover:-translate-y-0.5"
      style={style}
    >
      {certified && (
        <span className="grid h-4 w-4 flex-none place-items-center rounded-full text-[9px] font-bold text-white" style={{ background: "var(--primary)" }}>✓</span>
      )}
      {c.name || "Untitled"}
    </span>
  );
}

function CredentialCard({ c }: { c: Credential }) {
  const src = credPreview(c);
  const openCert = (e: React.MouseEvent) => { if (c.certificateUrl?.startsWith("data:")) { e.preventDefault(); openFileNewTab(c.certificateUrl); } };
  return (
    <div className="pf-card group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: "var(--line)", background: "var(--surface)", boxShadow: "0 4px 20px -12px rgb(var(--shadow-color) / 0.25)" }}>
      {/* banner */}
      <a
        href={c.certificateUrl || undefined}
        onClick={c.certificateUrl ? openCert : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block h-32 overflow-hidden"
        style={{ background: src ? "var(--surface-2)" : "var(--gradient)", pointerEvents: c.certificateUrl ? "auto" : "none" }}
      >
        {src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt={c.name} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.05]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-4xl font-extrabold text-white/90">{(c.name || "•").charAt(0).toUpperCase()}</span>
        )}
        {c.verificationId && (
          <span className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm" style={{ background: "var(--surface)", color: "var(--success)" }}>✓ Verified</span>
        )}
        {c.certificateUrl && (
          <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center py-1.5 text-[11px] font-bold text-white transition-transform duration-300 group-hover:translate-y-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}>
            View certificate ↗
          </span>
        )}
      </a>
      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <p className="font-bold leading-tight" style={{ color: "var(--ink)" }}>{c.name || "Certificate"}</p>
        {c.certification && <p className="mt-1 text-xs leading-snug" style={{ color: "var(--body)" }}>{c.certification}</p>}
        {c.issuer && <p className="mt-1 text-[11px] font-medium" style={{ color: "var(--muted)" }}>{c.issuer}</p>}
        {c.verificationId && <p className="mt-1 font-mono text-[10px]" style={{ color: "var(--muted)" }}>ID · {c.verificationId}</p>}
        {c.verificationUrl && (
          <a href={c.verificationUrl} target="_blank" rel="noopener noreferrer" className="mt-auto pt-2 text-[11px] font-bold hover:underline" style={{ color: "var(--primary)" }}>Verify credential ↗</a>
        )}
      </div>
    </div>
  );
}

function SkillsSection({ id, items }: { id: "tech" | "ai"; items: Credential[] }) {
  const certified = items.filter((c) => c.certificateUrl || c.verificationId || c.certification || c.issuer);
  return (
    <SectionCard id={id} title={SECTION_META[id].title}>
      <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>
        <span>{items.length} {id === "ai" ? "AI skills" : "technologies"}</span>
        {certified.length > 0 && <><span style={{ color: "var(--line)" }}>•</span><span style={{ color: "var(--primary)" }}>{certified.length} certified</span></>}
      </div>

      {/* clean chips (all skills) */}
      <div className="flex flex-wrap gap-2">
        {items.map((c) => <SkillChip key={c.id} c={c} variant={id} />)}
      </div>

      {/* certificate showcase (certified skills) */}
      {certified.length > 0 && (
        <>
          <p className="mb-3 mt-5 flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--primary)" }}>
            <span className="h-px w-6" style={{ background: "var(--primary)" }} />
            Certifications
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {certified.map((c) => <CredentialCard key={c.id} c={c} />)}
          </div>
        </>
      )}
    </SectionCard>
  );
}

// ------------------------------- projects -------------------------------
function ProjectCard({ pr }: { pr: Portfolio["projects"][number] }) {
  const stack = pr.techStack ?? [];
  const shown = stack.slice(0, 6);
  const extra = stack.length - shown.length;
  return (
    <div className="pf-card group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: "var(--line)", background: "var(--surface)", boxShadow: "0 6px 24px -14px rgb(var(--shadow-color) / 0.3)" }}>
      {/* media banner */}
      <a
        href={pr.url || undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block aspect-[16/9] overflow-hidden"
        style={{ background: pr.imageUrl ? "var(--surface-2)" : "var(--gradient)", pointerEvents: pr.url ? "auto" : "none" }}
        aria-label={pr.url ? `Open ${pr.name}` : undefined}
      >
        {pr.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={pr.imageUrl} alt={pr.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.06]" />
        ) : (
          <span className="grid h-full w-full place-items-center text-5xl font-extrabold text-white/90">{(pr.name || "•").charAt(0).toUpperCase()}</span>
        )}
        {pr.url && (
          <>
            <span className="absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.55), transparent 60%)" }} />
            <span className="absolute bottom-3 left-3 inline-flex translate-y-2 items-center gap-1 rounded-full px-3 py-1.5 text-[11px] font-bold text-white opacity-0 transition-all duration-300 group-hover:translate-y-0 group-hover:opacity-100" style={{ background: "var(--primary)" }}>
              Open project ↗
            </span>
          </>
        )}
      </a>

      {/* body */}
      <div className="flex flex-1 flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-extrabold leading-tight" style={{ color: "var(--ink)" }}>{pr.name || "Project"}</h3>
          {pr.url && (
            <a href={pr.url} target="_blank" rel="noopener noreferrer" aria-label="Open project" className="mt-0.5 flex-none transition-transform hover:scale-110" style={{ color: "var(--primary)" }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 17 17 7M7 7h10v10" /></svg>
            </a>
          )}
        </div>
        {pr.description && <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--body)" }}>{pr.description}</p>}
        {shown.length > 0 && (
          <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
            {shown.map((t) => (
              <span key={t} className="rounded-md px-2 py-1 text-[11px] font-semibold" style={{ background: "var(--surface-2)", color: "var(--body)" }}>{t}</span>
            ))}
            {extra > 0 && <span className="rounded-md px-2 py-1 text-[11px] font-bold" style={{ background: "var(--tint)", color: "var(--primary)" }}>+{extra}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function ProjectsSection({ p }: { p: Portfolio }) {
  return (
    <SectionCard id="projects" title="Projects">
      <div className="grid gap-5 md:grid-cols-2">
        {p.projects.map((pr) => <ProjectCard key={pr.id} pr={pr} />)}
      </div>
    </SectionCard>
  );
}

// ------------------------------- achievements -------------------------------
function AchievementCard({ a }: { a: Portfolio["achievements"][number] }) {
  const src = credPreview(a);
  const openCert = (e: React.MouseEvent) => { if (a.certificateUrl?.startsWith("data:")) { e.preventDefault(); openFileNewTab(a.certificateUrl); } };
  return (
    <div className="pf-card group flex flex-col overflow-hidden rounded-2xl border transition-all duration-300 hover:-translate-y-1" style={{ borderColor: "var(--line)", background: "var(--surface)", boxShadow: "0 6px 24px -14px rgb(var(--shadow-color) / 0.3)" }}>
      {/* framed certificate */}
      <a
        href={a.certificateUrl || undefined}
        onClick={a.certificateUrl ? openCert : undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="relative block"
        style={{ pointerEvents: a.certificateUrl ? "auto" : "none" }}
        aria-label={a.certificateUrl ? `View ${a.name} certificate` : undefined}
      >
        <div className="relative m-3 mb-0 aspect-[3/2] overflow-hidden rounded-xl border" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={src} alt={a.name} className="h-full w-full object-contain p-2 transition-transform duration-500 group-hover:scale-[1.05]" />
          ) : (
            <span className="grid h-full w-full place-items-center text-white" style={{ background: "var(--gradient)" }}>
              <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></svg>
            </span>
          )}
          {a.certificateUrl && (
            <span className="absolute inset-x-0 bottom-0 flex translate-y-full items-center justify-center py-1.5 text-[11px] font-bold text-white transition-transform duration-300 group-hover:translate-y-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.65), transparent)" }}>
              View certificate ↗
            </span>
          )}
        </div>
        {/* medal badge */}
        <span className="absolute left-5 top-5 grid h-8 w-8 place-items-center rounded-full text-white shadow-md" style={{ background: "var(--primary)" }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="5" /><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5" /></svg>
        </span>
        {a.verificationId && (
          <span className="absolute right-5 top-5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold shadow-sm" style={{ background: "var(--surface)", color: "var(--success)" }}>✓ Verified</span>
        )}
      </a>

      {/* body */}
      <div className="flex flex-1 flex-col p-4">
        <h3 className="font-bold leading-tight" style={{ color: "var(--ink)" }}>{a.name || "Achievement"}</h3>
        {a.issuer && <p className="mt-0.5 text-[11px] font-semibold" style={{ color: "var(--primary)" }}>{a.issuer}</p>}
        {(a.verificationUrl || a.verificationId) && (
          <div className="mt-auto flex items-center gap-3 pt-3 text-[11px] font-bold">
            {a.verificationUrl && <a href={a.verificationUrl} target="_blank" rel="noopener noreferrer" className="hover:underline" style={{ color: "var(--primary)" }}>Verify credential ↗</a>}
            {a.verificationId && !a.verificationUrl && <span className="font-mono font-medium" style={{ color: "var(--muted)" }}>ID · {a.verificationId}</span>}
          </div>
        )}
      </div>
    </div>
  );
}

function AchievementsSection({ p }: { p: Portfolio }) {
  const items = p.achievements ?? [];
  return (
    <SectionCard id="achievements" title={SECTION_META.achievements.title}>
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((a) => <AchievementCard key={a.id} a={a} />)}
      </div>
    </SectionCard>
  );
}

// ------------------------------- view -------------------------------
function isEmpty(p: Portfolio, id: SectionId): boolean {
  switch (id) {
    case "profile": return false;
    case "coding": return p.codingProfiles.length === 0;
    case "tech": return p.technologies.length === 0;
    case "ai": return p.aiSkills.length === 0;
    case "projects": return p.projects.length === 0;
    case "achievements": return (p.achievements?.length ?? 0) === 0;
  }
}
function renderSection(id: SectionId, p: Portfolio) {
  switch (id) {
    case "profile": return <ProfileSection p={p} />;
    case "coding": return <CodingSection p={p} />;
    case "tech": return <SkillsSection id="tech" items={p.technologies as Credential[]} />;
    case "ai": return <SkillsSection id="ai" items={p.aiSkills as Credential[]} />;
    case "projects": return <ProjectsSection p={p} />;
    case "achievements": return <AchievementsSection p={p} />;
  }
}

export function PortfolioView({ portfolio, print = false }: { portfolio: Portfolio; print?: boolean }) {
  const { setOrg } = useTheme();
  useEffect(() => { if (!print) setOrg(portfolio.org); }, [portfolio.org, setOrg, print]);

  const visible = ensureSections(portfolio.sectionOrder).filter((id) => !isEmpty(portfolio, id));

  return (
    <StaticCtx.Provider value={print}>
      <div className="w-full">
        <div className="flex flex-col gap-4">
          {visible.map((id, i) => (
            <div key={id} id={`sec-${id}`} data-section={id} data-title={SECTION_META[id].title} className="pf-sec scroll-mt-24">
              <Reveal i={i}>{renderSection(id, portfolio)}</Reveal>
            </div>
          ))}
        </div>

        <p className="mt-8 text-center text-xs font-semibold" style={{ color: "var(--muted)" }}>
          <span className="font-mono">{portfolio.employeeCode}</span> · Torii Digital Portfolio
        </p>
      </div>
    </StaticCtx.Provider>
  );
}
