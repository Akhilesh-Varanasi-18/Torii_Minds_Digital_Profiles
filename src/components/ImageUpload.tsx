"use client";

import { useRef, useState } from "react";

/** Downscale + compress a picked file to a small data URL (stored in the DB). */
async function fileToDataUrl(file: File, max = 1024, quality = 0.85): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = dataUrl;
  });
  const scale = Math.min(1, max / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) return dataUrl;
  ctx.drawImage(img, 0, 0, w, h);
  const out = canvas.toDataURL("image/webp", quality);
  return out.startsWith("data:image/webp") ? out : canvas.toDataURL("image/jpeg", quality);
}

function UploadIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <path d="M17 8l-5-5-5 5" />
      <path d="M12 3v12" />
    </svg>
  );
}

export function ImageUpload({
  value,
  onChange,
  label = "Image",
  rounded = false,
  aspect = "square",
}: {
  value?: string;
  onChange: (v: string) => void;
  label?: string;
  rounded?: boolean;
  aspect?: "square" | "video";
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const isVideo = aspect === "video";

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setErr("Please choose an image file.");
      return;
    }
    if (file.size > 8 * 1024 * 1024) {
      setErr("Image is larger than 8 MB — pick a smaller one.");
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      onChange(await fileToDataUrl(file));
    } catch {
      setErr("Couldn't read that image.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const pick = () => inputRef.current?.click();
  const boxClass = isVideo ? "h-44 w-full" : "h-24 w-24 shrink-0";

  const dropzone = (
    <button
      type="button"
      onClick={pick}
      disabled={busy}
      className={`group relative overflow-hidden border transition-colors hover:border-primary ${boxClass} ${rounded ? "rounded-full" : "rounded-xl"}`}
      style={{ background: "var(--surface-2)", borderColor: "var(--line)" }}
      aria-label={value ? "Replace image" : "Upload image"}
    >
      {value ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={value} alt="preview" className={`h-full w-full ${isVideo ? "object-contain" : "object-cover"}`} />
      ) : (
        <span className="flex h-full w-full flex-col items-center justify-center gap-1.5" style={{ color: "var(--muted)" }}>
          <UploadIcon />
          <span className="text-xs font-medium">Click to upload</span>
        </span>
      )}
      {value && !busy && (
        <span className="absolute inset-0 hidden items-center justify-center bg-black/45 text-xs font-semibold text-white group-hover:flex">
          Replace
        </span>
      )}
      {busy && (
        <span className="absolute inset-0 grid place-items-center bg-black/50 text-xs font-semibold text-white">
          Processing…
        </span>
      )}
    </button>
  );

  const controls = (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={pick} disabled={busy} className="btn btn-ghost text-sm">
          {busy ? "Processing…" : value ? "Replace" : "Upload from device"}
        </button>
        {value && (
          <button type="button" onClick={() => onChange("")} className="btn btn-ghost text-sm" style={{ color: "var(--danger)" }}>
            Remove
          </button>
        )}
      </div>
      <input
        className="field text-xs"
        placeholder="…or paste an image URL"
        value={value?.startsWith("data:") ? "" : value ?? ""}
        onChange={(e) => onChange(e.target.value)}
      />
      {err && <p className="text-xs" style={{ color: "var(--danger)" }}>{err}</p>}
      {value?.startsWith("data:") && (
        <p className="text-xs" style={{ color: "var(--muted)" }}>Uploaded from device · stored with your portfolio.</p>
      )}
    </div>
  );

  return (
    <div>
      <span className="label">{label}</span>
      {isVideo ? (
        <div className="flex flex-col gap-2">
          {dropzone}
          {controls}
        </div>
      ) : (
        <div className="flex items-start gap-3">
          {dropzone}
          <div className="min-w-0 flex-1">{controls}</div>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" hidden onChange={onPick} />
    </div>
  );
}
