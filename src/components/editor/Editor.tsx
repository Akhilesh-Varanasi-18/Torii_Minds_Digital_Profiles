"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  TouchSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SiteHeader } from "@/components/SiteHeader";
import { SectionTracker } from "@/components/SectionTracker";
import { ImageUpload } from "@/components/ImageUpload";
import { FileUpload } from "@/components/FileUpload";
import { CertUpload } from "@/components/editor/CertUpload";
import type { CertFields } from "@/lib/certparse";
import { useTheme } from "@/components/ThemeProvider";
import { PLATFORM_META } from "@/lib/coding";
import {
  SECTION_META,
  ensureSections,
  normalizeCode,
  type Credential,
  type CodingPlatform,
  type CodingProfile,
  type Portfolio,
  type Project,
  type SectionId,
} from "@/types/portfolio";

const uid = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);

// Projects keep a short description (≈ one sentence on the project + one on the role).
const PROJECT_DESC_MAX = 180;
// Technologies & AI skills keep the certification text to a single line.
const CERT_LINE_MAX = 140;

// ============================ small UI atoms ============================
function Field(props: React.InputHTMLAttributes<HTMLInputElement> & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <input {...rest} className="field" />
    </label>
  );
}
function Area(props: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string }) {
  const { label, ...rest } = props;
  return (
    <label className="block">
      {label && <span className="label">{label}</span>}
      <textarea {...rest} className="field min-h-[90px] resize-y" />
    </label>
  );
}
function AddButton({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} className="flex items-center gap-2 rounded-xl border border-dashed px-4 py-2.5 text-sm font-semibold transition-colors hover:border-primary hover:text-primary" style={{ color: "var(--muted)" }}>
      <span className="text-lg leading-none">+</span> {children}
    </button>
  );
}
function RemoveButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} aria-label="Remove" className="grid h-8 w-8 shrink-0 place-items-center rounded-lg transition-colors hover:bg-[var(--tint)]" style={{ color: "var(--danger)" }}>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6" /></svg>
    </button>
  );
}
function ItemCard({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border p-4" style={{ background: "var(--surface-2)" }}>{children}</div>;
}

// ============================ sortable section row ============================
function SortableRow({ id }: { id: SectionId }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const meta = SECTION_META[id];
  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.6 : 1, background: "var(--surface)" }}
      className="flex items-center gap-3 rounded-xl border px-4 py-3 shadow-sm"
    >
      <button {...attributes} {...listeners} aria-label="Drag to reorder" className="cursor-grab touch-none active:cursor-grabbing" style={{ color: "var(--muted)" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><circle cx="9" cy="6" r="1.6" /><circle cx="15" cy="6" r="1.6" /><circle cx="9" cy="12" r="1.6" /><circle cx="15" cy="12" r="1.6" /><circle cx="9" cy="18" r="1.6" /><circle cx="15" cy="18" r="1.6" /></svg>
      </button>
      <div className="min-w-0">
        <p className="font-semibold leading-tight">{meta.title}</p>
        <p className="truncate text-xs" style={{ color: "var(--muted)" }}>{meta.blurb}</p>
      </div>
    </div>
  );
}

// ============================ main editor ============================
export function Editor({ code }: { code: string }) {
  const router = useRouter();
  const { setOrg } = useTheme();
  const [p, setP] = useState<Portfolio | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  // Pending navigation waiting on the unsaved-changes prompt.
  const [guard, setGuard] = useState<null | "back" | "reload">(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch(`/api/portfolio/${encodeURIComponent(normalizeCode(code))}`);
        if (!alive) return;
        if (res.status === 404) { setNotFound(true); return; }
        const json = await res.json();
        const pf: Portfolio = json.portfolio;
        // Backfill for older documents that predate newer sections.
        pf.sectionOrder = ensureSections(pf.sectionOrder);
        pf.achievements = pf.achievements ?? [];
        setP(pf);
        setOrg(pf.org);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  // generic patch helper — any edit marks the portfolio dirty
  const patch = useCallback((fn: (prev: Portfolio) => Portfolio) => {
    setP((prev) => (prev ? fn(prev) : prev));
    setDirty(true);
  }, []);

  async function save(): Promise<boolean> {
    if (!p) return false;
    setSaving(true);
    try {
      const res = await fetch(`/api/portfolio/${encodeURIComponent(p.employeeCode)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(p),
      });
      if (res.ok) {
        setSavedAt(new Date().toLocaleTimeString());
        setDirty(false);
        return true;
      }
      return false;
    } finally {
      setSaving(false);
    }
  }

  // ---- unsaved-changes navigation guard ----
  const goToPortfolio = useCallback(() => {
    router.push(`/${normalizeCode(code)}`);
  }, [router, code]);

  // Attempt an in-app "back": prompt if there are unsaved changes.
  function attemptBack() {
    if (dirty) setGuard("back");
    else goToPortfolio();
  }

  // Warn on hard reload / tab close (browsers only allow a native prompt here).
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!dirty) return;
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Intercept the browser Back button while dirty → show our modal.
  useEffect(() => {
    if (!dirty) return;
    window.history.pushState(null, "", window.location.href);
    const onPop = () => {
      window.history.pushState(null, "", window.location.href);
      setGuard("back");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [dirty]);

  // Intercept keyboard reload (F5 / Ctrl+R / Cmd+R) while dirty → show our modal.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const isReload = e.key === "F5" || ((e.ctrlKey || e.metaKey) && (e.key === "r" || e.key === "R"));
      if (isReload && dirty) {
        e.preventDefault();
        setGuard("reload");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [dirty]);

  function proceed(intent: "back" | "reload") {
    setGuard(null);
    if (intent === "reload") window.location.reload();
    else goToPortfolio();
  }
  async function saveAndGo(intent: "back" | "reload") {
    const ok = await save();
    if (ok) proceed(intent);
  }
  function discardAndGo(intent: "back" | "reload") {
    setDirty(false);
    // let dirty=false settle so beforeunload doesn't fire on reload
    setTimeout(() => proceed(intent), 0);
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id || !p) return;
    const oldIndex = p.sectionOrder.indexOf(active.id as SectionId);
    const newIndex = p.sectionOrder.indexOf(over.id as SectionId);
    patch((prev) => ({ ...prev, sectionOrder: arrayMove(prev.sectionOrder, oldIndex, newIndex) }));
  }

  if (loading) {
    return (
      <div className="min-h-screen"><SiteHeader /><div className="mx-auto max-w-3xl px-4 py-20 text-center" style={{ color: "var(--muted)" }}>Loading your portfolio…</div></div>
    );
  }
  if (notFound || !p) {
    return (
      <div className="min-h-screen"><SiteHeader />
        <div className="mx-auto max-w-md px-4 py-20 text-center">
          <h1 className="text-2xl font-bold">No portfolio for “{normalizeCode(code)}”</h1>
          <p className="mt-2" style={{ color: "var(--muted)" }}>Create one from the home page.</p>
          <Link href="/" className="btn btn-primary mt-6">← Back home</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24">
      <SiteHeader />

      {/* sticky action bar */}
      <div className="sticky top-16 z-30 border-b backdrop-blur-md" style={{ backgroundColor: "color-mix(in srgb, var(--bg) 85%, transparent)", borderColor: "var(--line)" }}>
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <button
              onClick={attemptBack}
              aria-label="Back to portfolio"
              className="grid h-9 w-9 flex-none place-items-center rounded-full border transition-colors hover:border-primary hover:text-primary"
              style={{ color: "var(--ink)" }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            </button>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{p.name}</p>
              <p className="font-mono text-xs" style={{ color: "var(--muted)" }}>
                {p.employeeCode}
                {dirty && <span className="ml-2" style={{ color: "var(--warning)" }}>• unsaved</span>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {savedAt && !dirty && <span className="hidden text-xs sm:inline" style={{ color: "var(--success)" }}>Saved {savedAt}</span>}
            <button onClick={attemptBack} className="btn btn-ghost text-sm">Preview</button>
            <button onClick={save} disabled={saving} className="btn btn-primary text-sm">{saving ? "Saving…" : "Save"}</button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl gap-8 px-4 py-8 sm:px-6 lg:grid lg:grid-cols-[210px_minmax(0,1fr)]">
        <aside className="lg:sticky lg:top-[128px] lg:h-fit lg:self-start">
          <SectionTracker />
        </aside>

        <main className="min-w-0 space-y-8">
        {/* profile basics */}
        <Field label="Full name" value={p.name} onChange={(e) => patch((v) => ({ ...v, name: e.target.value }))} />

        {/* STRUCTURE */}
        <section id="sec-structure" data-section="structure" data-title="Structure" className="card scroll-mt-32 p-5">
          <h2 className="text-lg font-bold">Structure</h2>
          <p className="mb-4 text-sm" style={{ color: "var(--muted)" }}>Drag to set the order your sections appear in. Empty sections are hidden automatically.</p>
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            <SortableContext items={p.sectionOrder} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-2">
                {p.sectionOrder.map((id) => <SortableRow key={id} id={id} />)}
              </div>
            </SortableContext>
          </DndContext>
        </section>

        <ProfileForm p={p} patch={patch} />
        <CodingForm p={p} patch={patch} />
        <CredentialForm p={p} patch={patch} section="tech" />
        <CredentialForm p={p} patch={patch} section="ai" />
        <ProjectsForm p={p} patch={patch} />
        <AchievementsForm p={p} patch={patch} />

        <div className="flex justify-end">
          <button onClick={save} disabled={saving} className="btn btn-primary">{saving ? "Saving…" : "Save portfolio"}</button>
        </div>
        </main>
      </div>

      <UnsavedModal
        intent={guard}
        saving={saving}
        onSave={() => guard && saveAndGo(guard)}
        onDiscard={() => guard && discardAndGo(guard)}
        onCancel={() => setGuard(null)}
      />
    </div>
  );
}

// ---- unsaved-changes confirmation modal ----
function UnsavedModal({
  intent,
  saving,
  onSave,
  onDiscard,
  onCancel,
}: {
  intent: null | "back" | "reload";
  saving: boolean;
  onSave: () => void;
  onDiscard: () => void;
  onCancel: () => void;
}) {
  const verb = intent === "reload" ? "reload" : "go back";
  return (
    <AnimatePresence>
      {intent && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
          <motion.div
            className="card relative z-10 w-full max-w-md p-6"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ duration: 0.2, ease: [0.23, 1, 0.32, 1] }}
          >
            <div className="mb-3 flex items-center gap-3">
              <span className="grid h-10 w-10 flex-none place-items-center rounded-full" style={{ background: "var(--tint)", color: "var(--warning)" }}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
              </span>
              <h3 className="text-lg font-bold">Unsaved changes</h3>
            </div>
            <p className="text-sm" style={{ color: "var(--body)" }}>
              You have changes that haven&apos;t been saved. If you {verb} now, your unsaved
              changes will be lost. Would you like to save them first?
            </p>
            <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button onClick={onCancel} className="btn btn-ghost text-sm">Cancel</button>
              <button onClick={onDiscard} className="btn btn-ghost text-sm" style={{ color: "var(--danger)" }}>
                Discard &amp; {verb}
              </button>
              <button onClick={onSave} disabled={saving} className="btn btn-primary text-sm">
                {saving ? "Saving…" : `Save & ${verb}`}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

type PatchFn = (fn: (prev: Portfolio) => Portfolio) => void;

function SectionCard({ id, children }: { id: SectionId; children: React.ReactNode }) {
  const meta = SECTION_META[id];
  return (
    <section id={`sec-${id}`} data-section={id} data-title={meta.title} className="card scroll-mt-32 p-5">
      <div className="mb-4">
        <h2 className="text-lg font-bold">{meta.title}</h2>
        <p className="text-sm" style={{ color: "var(--muted)" }}>{meta.blurb}</p>
      </div>
      {children}
    </section>
  );
}

// ---------------------------- PROFILE ----------------------------
function ProfileForm({ p, patch }: { p: Portfolio; patch: PatchFn }) {
  const pr = p.profile;
  const set = (k: keyof typeof pr, val: string) => patch((v) => ({ ...v, profile: { ...v.profile, [k]: val } }));
  return (
    <SectionCard id="profile">
      <div className="mb-4">
        <ImageUpload value={pr.photoUrl} onChange={(v) => set("photoUrl", v)} label="Profile photo" rounded />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Headline" placeholder="Full-Stack Engineer" value={pr.headline ?? ""} onChange={(e) => set("headline", e.target.value)} />
        <Field label="Location" placeholder="Bengaluru, India" value={pr.location ?? ""} onChange={(e) => set("location", e.target.value)} />
        <Field label="Email" placeholder="you@example.com" value={pr.email ?? ""} onChange={(e) => set("email", e.target.value)} />
        <Field label="Phone" placeholder="+91…" value={pr.phone ?? ""} onChange={(e) => set("phone", e.target.value)} />
      </div>
      <div className="mt-4">
        <FileUpload
          label="Resume"
          value={pr.resumeUrl}
          fileName={pr.resumeName}
          onChange={(v, name) =>
            patch((prev) => ({ ...prev, profile: { ...prev.profile, resumeUrl: v, resumeName: name } }))
          }
        />
      </div>
      <div className="mt-4 grid gap-4">
        <Field label="Tagline" placeholder="Building delightful software." value={pr.tagline ?? ""} onChange={(e) => set("tagline", e.target.value)} />
        <Area label="Bio" placeholder="A few sentences about you…" value={pr.bio ?? ""} onChange={(e) => set("bio", e.target.value)} />
      </div>

      <div className="mt-5">
        <span className="label">Social links</span>
        <div className="flex flex-col gap-2">
          {pr.socials.map((s) => (
            <div key={s.id} className="flex items-center gap-2">
              <input className="field max-w-[160px]" placeholder="platform" value={s.platform} onChange={(e) => patch((v) => ({ ...v, profile: { ...v.profile, socials: v.profile.socials.map((x) => x.id === s.id ? { ...x, platform: e.target.value } : x) } }))} />
              <input className="field flex-1" placeholder="https://…" value={s.url} onChange={(e) => patch((v) => ({ ...v, profile: { ...v.profile, socials: v.profile.socials.map((x) => x.id === s.id ? { ...x, url: e.target.value } : x) } }))} />
              <RemoveButton onClick={() => patch((v) => ({ ...v, profile: { ...v.profile, socials: v.profile.socials.filter((x) => x.id !== s.id) } }))} />
            </div>
          ))}
        </div>
        <div className="mt-2">
          <AddButton onClick={() => patch((v) => ({ ...v, profile: { ...v.profile, socials: [...v.profile.socials, { id: uid(), platform: "", url: "" }] } }))}>Add social link</AddButton>
        </div>
      </div>
    </SectionCard>
  );
}

// ---------------------------- CODING ----------------------------
function CodingForm({ p, patch }: { p: Portfolio; patch: PatchFn }) {
  const [platform, setPlatform] = useState<CodingPlatform>("leetcode");
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    if (!url.trim()) return;
    setBusy(true); setErr(null);
    const id = uid();
    try {
      const res = await fetch("/api/coding/fetch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ platform, url: url.trim() }),
      });
      const json = await res.json();
      const profile: CodingProfile = json.ok
        ? { id, platform, profileUrl: url.trim(), username: json.data.username, displayName: json.data.displayName, avatarUrl: json.data.avatarUrl, stats: json.data.stats, fetchStatus: "ok", lastFetchedAt: new Date().toISOString() }
        : { id, platform, profileUrl: url.trim(), stats: [{ label: "Profile", value: "View profile →", kind: "meta" }], fetchStatus: "failed", fetchError: json.error, lastFetchedAt: new Date().toISOString() };
      if (!json.ok) setErr(`Couldn't auto-fetch (${json.error}). Added as a link — you can retry.`);
      patch((v) => ({ ...v, codingProfiles: [...v.codingProfiles, profile] }));
      setUrl("");
    } catch {
      setErr("Network error while fetching.");
    } finally {
      setBusy(false);
    }
  }

  async function refetch(cp: CodingProfile) {
    const res = await fetch("/api/coding/fetch", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ platform: cp.platform, url: cp.profileUrl }) });
    const json = await res.json();
    if (json.ok) {
      patch((v) => ({ ...v, codingProfiles: v.codingProfiles.map((x) => x.id === cp.id ? { ...x, ...json.data, fetchStatus: "ok", lastFetchedAt: new Date().toISOString() } : x) }));
    }
  }

  return (
    <SectionCard id="coding">
      <div className="flex flex-col gap-2 rounded-xl border border-dashed p-4 sm:flex-row sm:items-end" style={{ borderColor: "var(--line)" }}>
        <label className="block sm:w-48">
          <span className="label">Platform</span>
          <select className="field" value={platform} onChange={(e) => setPlatform(e.target.value as CodingPlatform)}>
            {Object.entries(PLATFORM_META).map(([k, m]) => (
              <option key={k} value={k}>{m.name}{m.reliable ? "" : " (scrape)"}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="label">Profile URL</span>
          <input className="field" placeholder={PLATFORM_META[platform].placeholder} value={url} onChange={(e) => setUrl(e.target.value)} />
        </label>
        <button onClick={add} disabled={busy} className="btn btn-primary">{busy ? "Fetching…" : "Add & fetch"}</button>
      </div>
      {err && <p className="mt-2 text-sm" style={{ color: "var(--warning)" }}>{err}</p>}

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {p.codingProfiles.map((cp) => (
          <ItemCard key={cp.id}>
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg text-sm font-bold text-white" style={{ background: PLATFORM_META[cp.platform].color }}>{PLATFORM_META[cp.platform].name.charAt(0)}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{PLATFORM_META[cp.platform].name}</p>
                <p className="truncate text-xs" style={{ color: "var(--muted)" }}>@{cp.username || cp.profileUrl}</p>
              </div>
              <button onClick={() => refetch(cp)} aria-label="Refresh" title="Refresh stats" className="grid h-8 w-8 place-items-center rounded-lg hover:text-primary" style={{ color: "var(--muted)" }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 12a9 9 0 1 1-2.6-6.4M21 4v5h-5" /></svg>
              </button>
              <RemoveButton onClick={() => patch((v) => ({ ...v, codingProfiles: v.codingProfiles.filter((x) => x.id !== cp.id) }))} />
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {cp.stats.slice(0, 6).map((s, i) => (
                <span key={i} className="rounded-md px-2 py-1 text-[11px] font-medium" style={{ background: "var(--surface)", color: "var(--body)" }}>{s.label}: <b style={{ color: "var(--ink)" }}>{s.value}</b></span>
              ))}
            </div>
          </ItemCard>
        ))}
      </div>
    </SectionCard>
  );
}

// ------------------- TECHNOLOGIES & AI SKILLS (shared) -------------------
// Both are "credentials" with identical inputs, so one form drives both.
function CredentialForm({ p, patch, section }: { p: Portfolio; patch: PatchFn; section: "tech" | "ai" }) {
  const key = section === "tech" ? "technologies" : "aiSkills";
  const items = (section === "tech" ? p.technologies : p.aiSkills) as Credential[];
  const namePh = section === "tech" ? "Technology (e.g. React)" : "AI technology (e.g. LangChain)";
  const addLabel = section === "tech" ? "Add technology" : "Add AI skill";

  const setItems = (fn: (arr: Credential[]) => Credential[]) =>
    patch((v) => ({ ...v, [key]: fn((section === "tech" ? v.technologies : v.aiSkills) as Credential[]) }) as Portfolio);

  const upd = (id: string, k: keyof Credential, val: string) =>
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, [k]: val } : x)));

  // Autofill from an uploaded certificate — only empty fields, never clobber.
  const applyCert = (id: string, f: CertFields) =>
    setItems((arr) =>
      arr.map((x) => {
        if (x.id !== id) return x;
        return {
          ...x,
          name: x.name?.trim() ? x.name : f.technology ?? f.certification ?? x.name,
          certification: x.certification?.trim() ? x.certification : f.certification ?? x.certification,
          issuer: x.issuer?.trim() ? x.issuer : f.issuer ?? x.issuer,
          verificationId: x.verificationId?.trim() ? x.verificationId : f.verificationId ?? x.verificationId,
          verificationUrl: x.verificationUrl?.trim() ? x.verificationUrl : f.verificationUrl ?? x.verificationUrl,
        };
      })
    );

  return (
    <SectionCard id={section}>
      <div className="grid gap-3">
        {items.map((t) => (
          <ItemCard key={t.id}>
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3">
                <CertUpload
                  value={t.certificateUrl}
                  fileName={t.certificateName}
                  thumb={t.certificateThumb}
                  onFile={(url, name, thumb) => setItems((arr) => arr.map((x) => (x.id === t.id ? { ...x, certificateUrl: url, certificateName: name, certificateThumb: thumb } : x)))}
                  onAnalyze={(f) => applyCert(t.id, f)}
                />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field placeholder={namePh} value={t.name} onChange={(e) => upd(t.id, "name", e.target.value)} />
                  <Field placeholder="Description — one line (optional)" maxLength={CERT_LINE_MAX} value={t.certification ?? ""} onChange={(e) => upd(t.id, "certification", e.target.value.slice(0, CERT_LINE_MAX))} />
                  <Field placeholder="Issuer (optional)" value={t.issuer ?? ""} onChange={(e) => upd(t.id, "issuer", e.target.value)} />
                  <Field placeholder="Verification ID (optional)" value={t.verificationId ?? ""} onChange={(e) => upd(t.id, "verificationId", e.target.value)} />
                </div>
                <Field placeholder="Verification URL (optional)" value={t.verificationUrl ?? ""} onChange={(e) => upd(t.id, "verificationUrl", e.target.value)} />
              </div>
              <RemoveButton onClick={() => setItems((arr) => arr.filter((x) => x.id !== t.id))} />
            </div>
          </ItemCard>
        ))}
      </div>
      <div className="mt-3">
        <AddButton onClick={() => setItems((arr) => [...arr, { id: uid(), name: "" } as Credential])}>{addLabel}</AddButton>
      </div>
    </SectionCard>
  );
}

// Tech-stack input keeps its own raw text so commas/spaces/backspace behave
// naturally; the persisted array is derived from that text on each change.
function TechStackField({ value, onChange }: { value: string[]; onChange: (v: string[]) => void }) {
  const [text, setText] = useState(value.join(", "));
  return (
    <input
      className="field"
      placeholder="Tech stack (comma separated)"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        onChange(e.target.value.split(",").map((s) => s.trim()).filter(Boolean));
      }}
    />
  );
}

// ---------------------------- PROJECTS ----------------------------
function ProjectsForm({ p, patch }: { p: Portfolio; patch: PatchFn }) {
  const upd = (id: string, k: keyof Project, val: string | string[]) => patch((v) => ({ ...v, projects: v.projects.map((pr) => pr.id === id ? { ...pr, [k]: val } : pr) }));
  return (
    <SectionCard id="projects">
      <div className="grid gap-3">
        {p.projects.map((pr) => (
          <ItemCard key={pr.id}>
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field placeholder="Project name" value={pr.name} onChange={(e) => upd(pr.id, "name", e.target.value)} />
                  <Field placeholder="Live/repo URL" value={pr.url ?? ""} onChange={(e) => upd(pr.id, "url", e.target.value)} />
                </div>
                <ImageUpload value={pr.imageUrl} onChange={(v) => upd(pr.id, "imageUrl", v)} label="Project image" aspect="video" />
                <div>
                  <Area
                    placeholder="One line about the project + one line about your role…"
                    value={pr.description ?? ""}
                    maxLength={PROJECT_DESC_MAX}
                    onChange={(e) => upd(pr.id, "description", e.target.value.slice(0, PROJECT_DESC_MAX))}
                  />
                  <p className="mt-1 text-right text-[11px]" style={{ color: (pr.description?.length ?? 0) >= PROJECT_DESC_MAX ? "var(--danger)" : "var(--muted)" }}>
                    {(pr.description?.length ?? 0)}/{PROJECT_DESC_MAX} · keep it to one line on the project + one on your role
                  </p>
                </div>
                <TechStackField value={pr.techStack} onChange={(v) => upd(pr.id, "techStack", v)} />
              </div>
              <RemoveButton onClick={() => patch((v) => ({ ...v, projects: v.projects.filter((x) => x.id !== pr.id) }))} />
            </div>
          </ItemCard>
        ))}
      </div>
      <div className="mt-3"><AddButton onClick={() => patch((v) => ({ ...v, projects: [...v.projects, { id: uid(), name: "", techStack: [] }] }))}>Add project</AddButton></div>
    </SectionCard>
  );
}

// ---------------------------- ACHIEVEMENTS / OTHER CERTIFICATIONS ----------------------------
function AchievementsForm({ p, patch }: { p: Portfolio; patch: PatchFn }) {
  const items = p.achievements ?? [];
  const setItems = (fn: (arr: Portfolio["achievements"]) => Portfolio["achievements"]) =>
    patch((v) => ({ ...v, achievements: fn(v.achievements ?? []) }));
  const upd = (id: string, k: "name" | "issuer" | "verificationId" | "verificationUrl", val: string) =>
    setItems((arr) => arr.map((x) => (x.id === id ? { ...x, [k]: val } : x)));

  // Autofill from certificate OCR — fill only empty fields, never clobber.
  const applyCert = (id: string, f: CertFields) =>
    setItems((arr) =>
      arr.map((x) => {
        if (x.id !== id) return x;
        return {
          ...x,
          name: x.name?.trim() ? x.name : f.certification ?? f.technology ?? x.name,
          issuer: x.issuer?.trim() ? x.issuer : f.issuer ?? x.issuer,
          verificationId: x.verificationId?.trim() ? x.verificationId : f.verificationId ?? x.verificationId,
          verificationUrl: x.verificationUrl?.trim() ? x.verificationUrl : f.verificationUrl ?? x.verificationUrl,
        };
      })
    );

  return (
    <SectionCard id="achievements">
      <div className="grid gap-3">
        {items.map((a) => (
          <ItemCard key={a.id}>
            <div className="flex items-start gap-2">
              <div className="grid flex-1 gap-3">
                <CertUpload
                  value={a.certificateUrl}
                  fileName={a.certificateName}
                  thumb={a.certificateThumb}
                  onFile={(url, name, thumb) => setItems((arr) => arr.map((x) => (x.id === a.id ? { ...x, certificateUrl: url, certificateName: name, certificateThumb: thumb } : x)))}
                  onAnalyze={(f) => applyCert(a.id, f)}
                />
                <Field placeholder="Certification / achievement name" value={a.name} onChange={(e) => upd(a.id, "name", e.target.value)} />
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field placeholder="Issued by (optional)" value={a.issuer ?? ""} onChange={(e) => upd(a.id, "issuer", e.target.value)} />
                  <Field placeholder="Certification ID (optional)" value={a.verificationId ?? ""} onChange={(e) => upd(a.id, "verificationId", e.target.value)} />
                </div>
                <Field placeholder="Verification URL (optional)" value={a.verificationUrl ?? ""} onChange={(e) => upd(a.id, "verificationUrl", e.target.value)} />
              </div>
              <RemoveButton onClick={() => setItems((arr) => arr.filter((x) => x.id !== a.id))} />
            </div>
          </ItemCard>
        ))}
      </div>
      <div className="mt-3"><AddButton onClick={() => setItems((arr) => [...arr, { id: uid(), name: "" }])}>Add achievement / certification</AddButton></div>
    </SectionCard>
  );
}
