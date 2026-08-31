"use client";

import { useRef, useState } from "react";
import { openFileNewTab } from "@/lib/openFile";

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function prettySize(bytes?: number) {
  if (!bytes) return "";
  const kb = bytes / 1024;
  return kb < 1024 ? `${Math.round(kb)} KB` : `${(kb / 1024).toFixed(1)} MB`;
}

/** Upload a document (e.g. Resume PDF) as a data URL stored with the portfolio. */
export function FileUpload({
  value,
  fileName,
  onChange,
  label = "File",
  accept = "application/pdf",
  maxMB = 5,
}: {
  value?: string;
  fileName?: string;
  onChange: (value: string, fileName?: string) => void;
  label?: string;
  accept?: string;
  maxMB?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const isUploaded = value?.startsWith("data:");
  const hasValue = !!value;

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > maxMB * 1024 * 1024) {
      setErr(`File is larger than ${maxMB} MB — please upload a smaller one or paste a link.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      onChange(dataUrl, file.name);
    } catch {
      setErr("Couldn't read that file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <span className="label">{label}</span>

      {hasValue && (
        <div className="mb-2 flex items-center gap-3 rounded-xl border p-3" style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}>
          <span className="grid h-9 w-9 flex-none place-items-center rounded-lg" style={{ background: "var(--tint)", color: "var(--primary)" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium" style={{ color: "var(--ink)" }}>
              {fileName || (isUploaded ? "File attached" : value)}
            </p>
            <p className="text-xs" style={{ color: "var(--muted)" }}>{isUploaded ? "Uploaded · stored with your portfolio" : "Linked"}</p>
          </div>
          <a
            href={value}
            onClick={(e) => { if (isUploaded) { e.preventDefault(); openFileNewTab(value); } }}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost px-3 py-1.5 text-xs"
          >
            Preview
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="btn btn-ghost text-sm">
          {busy ? "Uploading…" : hasValue ? "Replace file" : "Upload from device"}
        </button>
        {hasValue && (
          <button type="button" onClick={() => onChange("", undefined)} className="btn btn-ghost text-sm" style={{ color: "var(--danger)" }}>
            Remove
          </button>
        )}
        <span className="text-xs" style={{ color: "var(--muted)" }}>PDF, up to {maxMB} MB</span>
      </div>

      <input
        className="field mt-2 text-xs"
        placeholder="…or paste a link (Google Drive, etc.)"
        value={isUploaded ? "" : value ?? ""}
        onChange={(e) => onChange(e.target.value, undefined)}
      />
      {err && <p className="mt-1 text-xs" style={{ color: "var(--danger)" }}>{err}</p>}
      <input ref={inputRef} type="file" accept={accept} hidden onChange={onPick} />
    </div>
  );
}
