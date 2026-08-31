"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders a certificate/résumé (image or PDF) INLINE in the page instead of
 * letting the browser navigate straight to the raw file. Desktop browsers
 * preview raw files fine, but mobile browsers download them and prompt
 * "choose an app". By fetching the bytes and drawing them ourselves (an <img>
 * for images, pdf.js canvases for PDFs) the preview works identically on
 * laptop and mobile — no download, no app picker.
 */
export function AssetViewer({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<"loading" | "image" | "pdf" | "error">("loading");
  const [imgSrc, setImgSrc] = useState<string>();
  const pdfRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let objectUrl: string | undefined;
    let cancelled = false;

    (async () => {
      try {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`asset fetch failed: ${res.status}`);
        const blob = await res.blob();
        const buf = await blob.arrayBuffer();
        const head = new Uint8Array(buf.slice(0, 5));
        const isPdf =
          blob.type === "application/pdf" ||
          // "%PDF" magic bytes — covers files served as octet-stream
          (head[0] === 0x25 && head[1] === 0x50 && head[2] === 0x44 && head[3] === 0x46);

        if (!isPdf && (blob.type.startsWith("image/") || blob.type === "" || blob.type === "application/octet-stream")) {
          objectUrl = URL.createObjectURL(blob);
          if (!cancelled) {
            setImgSrc(objectUrl);
            setStatus("image");
          }
          return;
        }

        if (isPdf) {
          const pdfjs = await import("pdfjs-dist");
          // Same worker source the uploader uses.
          pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;
          const pdf = await pdfjs.getDocument({ data: new Uint8Array(buf) }).promise;
          if (cancelled) return;
          setStatus("pdf");
          const container = pdfRef.current;
          if (!container) return;
          container.innerHTML = "";
          const dpr = Math.min(window.devicePixelRatio || 1, 2);
          for (let i = 1; i <= pdf.numPages; i++) {
            if (cancelled) return;
            const page = await pdf.getPage(i);
            const base = page.getViewport({ scale: 1 });
            const targetW = Math.min(container.clientWidth || 900, 1100);
            const viewport = page.getViewport({ scale: (targetW / base.width) * dpr });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.width = "100%";
            canvas.style.height = "auto";
            canvas.style.display = "block";
            canvas.style.margin = "0 auto 14px";
            canvas.style.borderRadius = "10px";
            canvas.style.boxShadow = "0 8px 30px rgba(0,0,0,0.35)";
            const ctx = canvas.getContext("2d");
            if (!ctx) continue;
            container.appendChild(canvas);
            await page.render({ canvas, canvasContext: ctx, viewport }).promise;
          }
          return;
        }

        throw new Error(`unsupported type: ${blob.type}`);
      } catch {
        if (!cancelled) setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);

  return (
    <div style={{ minHeight: "100vh", background: "#0f1216", color: "#e8eaed", display: "flex", flexDirection: "column" }}>
      <header
        style={{
          position: "sticky", top: 0, zIndex: 10,
          display: "flex", alignItems: "center", justifyContent: "space-between",
          gap: 12, padding: "12px 16px",
          background: "rgba(15,18,22,0.92)", backdropFilter: "blur(8px)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 15, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {title}
        </span>
        <a
          href={url}
          download
          style={{
            flex: "none", fontSize: 13, fontWeight: 700, textDecoration: "none",
            color: "#0f1216", background: "#e8eaed", padding: "7px 14px", borderRadius: 999,
          }}
        >
          ↓ Download
        </a>
      </header>

      <main style={{ flex: 1, padding: "16px", maxWidth: 1100, width: "100%", margin: "0 auto" }}>
        {status === "loading" && (
          <p style={{ textAlign: "center", opacity: 0.7, marginTop: 60 }}>Loading preview…</p>
        )}
        {status === "image" && imgSrc && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imgSrc}
            alt={title}
            style={{ display: "block", maxWidth: "100%", height: "auto", margin: "0 auto", borderRadius: 10, boxShadow: "0 8px 30px rgba(0,0,0,0.35)" }}
          />
        )}
        <div ref={pdfRef} style={{ display: status === "pdf" ? "block" : "none" }} />
        {status === "error" && (
          <div style={{ textAlign: "center", marginTop: 60 }}>
            <p style={{ opacity: 0.8 }}>Couldn&apos;t render a preview for this file.</p>
            <a href={url} download style={{ display: "inline-block", marginTop: 14, color: "#8ab4ff", fontWeight: 700 }}>
              Download the file instead ↓
            </a>
          </div>
        )}
      </main>
    </div>
  );
}
