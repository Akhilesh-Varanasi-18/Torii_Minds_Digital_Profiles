"use client";

import { useEffect, useRef, useState } from "react";
import { parseCertificateText, type CertFields } from "@/lib/certparse";
import { openFileNewTab } from "@/lib/openFile";
import { orientLandscape, rotate90, thumbnail } from "@/lib/imageutil";

function isImageUrl(u?: string): boolean {
  if (!u) return false;
  return u.startsWith("data:image") || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(u);
}

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = reject;
    r.readAsDataURL(file);
  });
}

function dataUrlToUint8(dataUrl: string): Uint8Array {
  const b64 = dataUrl.split(",")[1] ?? "";
  const bin = atob(b64);
  const arr = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
  return arr;
}

async function loadPdf(dataUrl: string) {
  const pdfjs = await import("pdfjs-dist");
  // Load the matching worker from a CDN (module worker).
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
  return pdfjs.getDocument({ data: dataUrlToUint8(dataUrl) }).promise;
}

/** Render page 1 of a PDF at a given scale to a canvas. */
async function pdfToCanvas(dataUrl: string, scale = 2): Promise<HTMLCanvasElement> {
  const pdf = await loadPdf(dataUrl);
  const page = await pdf.getPage(1);
  const viewport = page.getViewport({ scale });
  const canvas = document.createElement("canvas");
  canvas.width = viewport.width;
  canvas.height = viewport.height;
  const ctx = canvas.getContext("2d")!;
  await page.render({ canvasContext: ctx, viewport, canvas }).promise;
  return canvas;
}

/** A compact image preview of a PDF's first page (for the credential card). */
async function pdfThumbnail(dataUrl: string): Promise<string | undefined> {
  try {
    const pdf = await loadPdf(dataUrl);
    const page = await pdf.getPage(1);
    const base = page.getViewport({ scale: 1 });
    const scale = Math.min(2, 900 / base.width);
    const viewport = page.getViewport({ scale });
    const canvas = document.createElement("canvas");
    canvas.width = viewport.width;
    canvas.height = viewport.height;
    const ctx = canvas.getContext("2d")!;
    await page.render({ canvasContext: ctx, viewport, canvas }).promise;
    return canvas.toDataURL("image/webp", 0.8);
  } catch {
    return undefined;
  }
}

const FIELD_LABELS: Record<keyof CertFields, string> = {
  technology: "Technology",
  certification: "Certificate",
  issuer: "Issuer",
  verificationId: "Verification ID",
  verificationUrl: "Verify link",
};

export function CertUpload({
  value,
  fileName,
  thumb,
  onFile,
  onAnalyze,
}: {
  value?: string;
  fileName?: string;
  thumb?: string;
  onFile: (url: string, name?: string, thumb?: string) => void;
  onAnalyze: (fields: CertFields) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<string | null>(null);
  const [detected, setDetected] = useState<CertFields | null>(null);
  const [rotating, setRotating] = useState(false);

  const isUploaded = value?.startsWith("data:");
  const isPdf = value?.startsWith("data:application/pdf");
  const previewSrc = isPdf ? thumb : isImageUrl(value) ? value : undefined;
  const preparing = !!value && isPdf && !thumb;

  // Backfill a preview for PDFs uploaded before thumbnails existed.
  useEffect(() => {
    if (!value || !isPdf || thumb) return;
    let alive = true;
    (async () => {
      let t = await pdfThumbnail(value);
      if (t) t = await orientLandscape(t);
      if (alive && t) onFile(value, fileName, t);
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, isPdf, thumb]);

  async function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setStatus("Certificate is larger than 8 MB — please use a smaller file.");
      return;
    }
    setStatus(null);
    setDetected(null);
    try {
      const dataUrl = await readAsDataUrl(file);
      const pdf = file.type === "application/pdf" || dataUrl.startsWith("data:application/pdf");
      setStatus("Preparing preview…");
      if (pdf) {
        // Render page 1 and auto-orient the thumbnail to landscape.
        let t = await pdfThumbnail(dataUrl);
        if (t) t = await orientLandscape(t);
        onFile(dataUrl, file.name, t);
      } else {
        // Auto-orient the image, and keep a small thumbnail for fast display
        // (the full image is only fetched on demand when viewing the cert).
        const oriented = await orientLandscape(dataUrl);
        const thumb = await thumbnail(oriented);
        onFile(oriented, file.name, thumb);
      }
      setStatus(null);
    } catch {
      setStatus("Couldn't read that file.");
    } finally {
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  // Manual 90° rotate — rotates the image (or the PDF's preview thumbnail).
  async function rotate() {
    if (!value) return;
    setRotating(true);
    try {
      if (isPdf) {
        if (thumb) onFile(value, fileName, await rotate90(thumb));
      } else {
        onFile(await rotate90(value), fileName, undefined);
      }
    } finally {
      setRotating(false);
    }
  }

  // Kept for v2 — currently unused because the "Analyze & autofill" button is disabled.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async function analyze() {
    if (!value) return;
    setBusy(true);
    setProgress(0);
    setStatus("Reading certificate…");
    setDetected(null);
    try {
      const Tesseract = (await import("tesseract.js")).default;
      const source: string | HTMLCanvasElement = isPdf ? await pdfToCanvas(value) : value;
      const { data } = await Tesseract.recognize(source, "eng", {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === "recognizing text") setProgress(Math.round(m.progress * 100));
        },
      });
      const fields = parseCertificateText(data.text || "");
      const found = Object.values(fields).filter(Boolean).length;
      if (found === 0) {
        setStatus("Couldn't confidently read details — please fill them in below.");
      } else {
        setDetected(fields);
        setStatus(null);
        onAnalyze(fields);
      }
    } catch (err) {
      setStatus(
        isPdf
          ? "Couldn't read that PDF automatically — try uploading an image of the certificate."
          : "Analysis failed — please fill the fields in manually."
      );
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-xl border border-dashed p-3" style={{ borderColor: "var(--line)" }}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="label mb-0 mr-1">Certificate</span>
        {value ? (
          <>
            <a
              href={value}
              onClick={(e) => { if (isUploaded) { e.preventDefault(); openFileNewTab(value); } }}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-medium hover:underline"
              style={{ color: "var(--primary)" }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /></svg>
              {fileName || (isUploaded ? "certificate" : "linked")}
            </a>
            {/* Auto-analyze (OCR) is disabled for v1 — fill the fields manually.
                Re-enable in the next version by restoring this button:
            <button type="button" onClick={analyze} disabled={busy} className="btn btn-primary px-3 py-1.5 text-xs">
              {busy ? (progress ? `Reading ${progress}%…` : "Analyzing…") : "Analyze & autofill"}
            </button> */}
            {isUploaded && (
              <button type="button" onClick={rotate} disabled={rotating} title="Rotate 90°" className="btn btn-ghost inline-flex items-center gap-1 px-3 py-1.5 text-xs">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 2v6h-6" /><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M3 22v-6h6" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /></svg>
                {rotating ? "…" : "Rotate"}
              </button>
            )}
            <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-ghost px-3 py-1.5 text-xs">Replace</button>
            <button type="button" onClick={() => { onFile("", undefined); setDetected(null); setStatus(null); }} className="btn btn-ghost px-3 py-1.5 text-xs" style={{ color: "var(--danger)" }}>Remove</button>
          </>
        ) : (
          <button type="button" onClick={() => inputRef.current?.click()} className="btn btn-ghost px-3 py-1.5 text-xs">
            Upload certificate (image / PDF)
          </button>
        )}
      </div>

      {/* visual preview so orientation is WYSIWYG */}
      {previewSrc && (
        <div className="mt-2 flex justify-center overflow-hidden rounded-lg border" style={{ borderColor: "var(--line)", background: "var(--surface-2)" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={previewSrc} alt="certificate preview" className="max-h-44 w-auto object-contain p-1.5" />
        </div>
      )}
      {preparing && <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>Generating preview…</p>}

      {busy && (
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full" style={{ background: "var(--surface)" }}>
          <div className="h-full rounded-full transition-all" style={{ width: `${progress || 8}%`, background: "var(--gradient)" }} />
        </div>
      )}
      {status && <p className="mt-2 text-xs" style={{ color: "var(--muted)" }}>{status}</p>}
      {detected && (
        <p className="mt-2 text-xs" style={{ color: "var(--success)" }}>
          Autofilled:{" "}
          {(Object.keys(detected) as (keyof CertFields)[])
            .filter((k) => detected[k])
            .map((k) => FIELD_LABELS[k])
            .join(", ")}{" "}
          — edit anything below.
        </p>
      )}

      <input ref={inputRef} type="file" accept="image/*,application/pdf" hidden onChange={onPick} />
    </div>
  );
}
