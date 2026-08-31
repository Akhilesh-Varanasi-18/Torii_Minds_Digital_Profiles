"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ORG_LIST, type OrgId } from "@/lib/themes";
import { formatEmployeeCode, ORG_CODE_PREFIX } from "@/types/portfolio";
import { useToast } from "@/components/Toast";

type Tab = "open" | "create" | "admin";

export function LookupPanel({ activeCode }: { activeCode?: string }) {
  const router = useRouter();
  const toast = useToast();
  const [tab, setTab] = useState<Tab>("open");

  // open
  const [code, setCode] = useState(activeCode ?? "");
  const [openBusy, setOpenBusy] = useState(false);

  // create
  const [newName, setNewName] = useState("");
  const [newCode, setNewCode] = useState("");
  const [newOrg, setNewOrg] = useState<OrgId>("torii");
  const [newPass, setNewPass] = useState("");
  const [createBusy, setCreateBusy] = useState(false);

  // admin
  const [adminCode, setAdminCode] = useState("");
  const [adminPass, setAdminPass] = useState("");
  const [adminBusy, setAdminBusy] = useState(false);

  function handleOpen(e: React.FormEvent) {
    e.preventDefault();
    const c = formatEmployeeCode(code);
    if (!c) return;
    setOpenBusy(true);
    router.push(`/${c}`);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const c = formatEmployeeCode(newCode, ORG_CODE_PREFIX[newOrg]);
    const n = newName.trim();
    if (!n || !c) { toast("Enter your name and employee code.", "error"); return; }
    if (!newPass) { toast("Enter the account-creation password.", "error"); return; }
    setCreateBusy(true);
    try {
      const res = await fetch("/api/portfolio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeCode: c, name: n, org: newOrg, password: newPass }),
      });
      if (res.status === 201) {
        toast(`Portfolio ${c} created!`, "success");
        router.push(`/${c}/edit`);
      } else if (res.status === 401) {
        toast("Incorrect password. Contact administration to get the account-creation password.", "error");
      } else if (res.status === 403) {
        toast(`Employee code ${c} isn't registered. Ask an admin to add your code.`, "error");
      } else if (res.status === 409) {
        toast(`${c} already has a portfolio — open it instead.`, "info");
      } else {
        toast("Could not create the portfolio. Please try again.", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setCreateBusy(false);
    }
  }

  async function handleAdmin(e: React.FormEvent) {
    e.preventDefault();
    const c = formatEmployeeCode(adminCode);
    if (!c) { toast("Enter an employee code to add.", "error"); return; }
    if (!adminPass) { toast("Enter the admin password.", "error"); return; }
    setAdminBusy(true);
    try {
      const res = await fetch("/api/admin/emp-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: c, adminPassword: adminPass }),
      });
      const json = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast("Incorrect admin password.", "error");
      } else if (res.ok && json.result === "added") {
        toast(`Added ${c} to the registry. It can now create a portfolio.`, "success");
        setAdminCode("");
      } else if (res.ok && json.result === "exists") {
        toast(`${c} is already registered.`, "info");
      } else {
        toast("Could not add the code. Please try again.", "error");
      }
    } catch {
      toast("Network error. Please try again.", "error");
    } finally {
      setAdminBusy(false);
    }
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "open", label: "Open" },
    { id: "create", label: "Create" },
    { id: "admin", label: "Admin" },
  ];

  return (
    <div className="w-full">
      {activeCode && (
        <div className="card mb-3 flex items-center justify-between gap-2 p-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--muted)" }}>Viewing</p>
            <p className="truncate font-mono text-sm font-bold" style={{ color: "var(--ink)" }}>{activeCode}</p>
          </div>
          <Link href={`/${activeCode}/edit`} className="btn btn-primary flex-none text-xs">✎ Edit</Link>
        </div>
      )}
      <div className="card w-full p-2 shadow-card-lg">
        <div className="grid grid-cols-3 gap-1 rounded-xl p-1" style={{ background: "var(--surface-2)" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className="relative rounded-lg py-2.5 text-sm font-semibold transition-colors" style={{ color: tab === t.id ? "var(--on-primary)" : "var(--muted)" }}>
              {tab === t.id && <motion.span layoutId="lp-tab" className="absolute inset-0 rounded-lg" style={{ background: "var(--primary)" }} transition={{ type: "spring", stiffness: 400, damping: 32 }} />}
              <span className="relative z-10">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="p-4 pt-5">
          {tab === "open" && (
            <form onSubmit={handleOpen} className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="lp-code">Employee code</label>
                <input id="lp-code" className="field font-mono tracking-wide" placeholder="e.g. 0020" value={code} onChange={(e) => setCode(e.target.value)} autoComplete="off" />
                {code.trim() && <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Opens <span className="font-mono font-semibold" style={{ color: "var(--primary)" }}>{formatEmployeeCode(code)}</span></p>}
              </div>
              <button type="submit" className="btn btn-primary w-full py-3" disabled={openBusy}>{openBusy ? "Opening…" : "View portfolio →"}</button>
              <p className="text-center text-xs" style={{ color: "var(--muted)" }}>Any portfolio link is public — no password needed.</p>
            </form>
          )}

          {tab === "create" && (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div>
                <label className="label" htmlFor="lp-name">Full name</label>
                <input id="lp-name" className="field" placeholder="e.g. Aarav Sharma" value={newName} onChange={(e) => setNewName(e.target.value)} autoComplete="off" />
              </div>
              <div>
                <label className="label" htmlFor="lp-newcode">Employee code</label>
                <input id="lp-newcode" className="field font-mono tracking-wide" placeholder="e.g. 0020" value={newCode} onChange={(e) => setNewCode(e.target.value)} autoComplete="off" />
                {newCode.trim() && <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Your code will be <span className="font-mono font-semibold" style={{ color: "var(--primary)" }}>{formatEmployeeCode(newCode, ORG_CODE_PREFIX[newOrg])}</span></p>}
              </div>
              <div>
                <label className="label">Organization</label>
                <div className="grid grid-cols-3 gap-2">
                  {ORG_LIST.map((o) => (
                    <button type="button" key={o.id} onClick={() => setNewOrg(o.id)} className="flex flex-col items-center gap-1.5 rounded-xl border px-2 py-3 text-xs font-semibold transition-all" style={{ borderColor: newOrg === o.id ? "var(--primary)" : "var(--line)", background: newOrg === o.id ? "var(--tint)" : "var(--surface)", color: "var(--ink)" }}>
                      <span className="h-4 w-4 rounded-full" style={{ background: o.swatch }} />
                      {o.name.split(" ")[0]}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="label" htmlFor="lp-pass">Account-creation password</label>
                <input id="lp-pass" type="password" className="field" placeholder="Team password" value={newPass} onChange={(e) => setNewPass(e.target.value)} autoComplete="new-password" />
                <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Required to create an account. Ask administration if you don&apos;t have it.</p>
              </div>
              <button type="submit" className="btn btn-primary w-full py-3" disabled={createBusy}>{createBusy ? "Creating…" : "Create my portfolio →"}</button>
            </form>
          )}

          {tab === "admin" && (
            <form onSubmit={handleAdmin} className="flex flex-col gap-4">
              <div className="rounded-xl border border-dashed p-3 text-xs leading-relaxed" style={{ borderColor: "var(--line)", color: "var(--muted)" }}>
                Register a new employee code so it can create a portfolio. Admin password required.
              </div>
              <div>
                <label className="label" htmlFor="lp-admincode">New employee code</label>
                <input id="lp-admincode" className="field font-mono tracking-wide" placeholder="e.g. 0039" value={adminCode} onChange={(e) => setAdminCode(e.target.value)} autoComplete="off" />
                {adminCode.trim() && <p className="mt-1.5 text-xs" style={{ color: "var(--muted)" }}>Adds <span className="font-mono font-semibold" style={{ color: "var(--primary)" }}>{formatEmployeeCode(adminCode)}</span></p>}
              </div>
              <div>
                <label className="label" htmlFor="lp-adminpass">Admin password</label>
                <input id="lp-adminpass" type="password" className="field" placeholder="Admin password" value={adminPass} onChange={(e) => setAdminPass(e.target.value)} autoComplete="new-password" />
              </div>
              <button type="submit" className="btn btn-primary w-full py-3" disabled={adminBusy}>{adminBusy ? "Adding…" : "Add employee code"}</button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
