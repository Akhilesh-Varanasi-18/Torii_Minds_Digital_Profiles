import { NextResponse } from "next/server";
import { portfolios } from "@/lib/mongodb";
import { normalizeCode } from "@/types/portfolio";
import { isOrg, isMode } from "@/lib/themes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 90;

// GET /api/portfolio/:code/export?format=html|pdf&org=torii&mode=light
// Renders the REAL portfolio (the /print route) with Playwright so exports look
// exactly like the live page — PDF keeps clickable links & clean A4 pagination;
// HTML is a self-contained page (styles inlined, scripts stripped).
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "pdf" ? "pdf" : "html";
  const normalized = normalizeCode(code);

  const col = await portfolios();
  const p = await col.findOne({ employeeCode: normalized }, { projection: { _id: 0, name: 1, org: 1 } });
  if (!p) return new NextResponse("Not found", { status: 404 });

  const org = isOrg(url.searchParams.get("org")) ? url.searchParams.get("org")! : p.org;
  const mode = isMode(url.searchParams.get("mode")) ? url.searchParams.get("mode")! : "light";
  const safeName = (p.name || normalized).replace(/[^a-z0-9]+/gi, "_").replace(/^_+|_+$/g, "") || normalized;

  const origin = `${req.headers.get("x-forwarded-proto") || "http"}://${req.headers.get("host")}`;
  const printUrl = `${origin}/${encodeURIComponent(normalized)}/print?org=${org}&mode=${mode}`;

  try {
    const { chromium } = await import("playwright");
    // --no-sandbox is required to launch Chromium as root inside a container
    // (e.g. the Render Docker image); harmless locally since we only ever
    // render our own trusted /print page.
    const browser = await chromium.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
    try {
      // Fixed desktop width (matches the HTML's laptop layout) and 2x scale so
      // the PDF screenshot is crisp.
      const context = await browser.newContext({
        viewport: { width: 1180, height: 1200 },
        deviceScaleFactor: 2,
      });
      const page = await context.newPage();
      await page.goto(printUrl, { waitUntil: "networkidle", timeout: 45000 }).catch(async () => {
        await page.goto(printUrl, { waitUntil: "load", timeout: 20000 });
      });
      // give fonts/images a beat to settle
      await page.waitForTimeout(400);

      if (format === "pdf") {
        // Continuous-flow PDF = one tall page identical to the HTML, no A4 gaps.
        // Chromium's page.pdf() CLIPS very tall single pages (silently drops the
        // bottom sections), so instead we screenshot the full page (captures
        // everything) and build a one-page PDF from that image with pdf-lib,
        // overlaying clickable link annotations so navigation still works.
        const DSF = 2;
        const links = await page.evaluate(() =>
          Array.from(document.querySelectorAll("a[href]"))
            .map((a) => {
              const r = a.getBoundingClientRect();
              return { href: (a as HTMLAnchorElement).href, x: r.left + window.scrollX, y: r.top + window.scrollY, w: r.width, h: r.height };
            })
            .filter((l) => l.w > 1 && l.h > 1 && l.href && !l.href.startsWith("javascript:"))
        );
        const png = await page.screenshot({ fullPage: true, type: "png" });

        const { PDFDocument, PDFName, PDFString } = await import("pdf-lib");
        const doc = await PDFDocument.create();
        const img = await doc.embedPng(png);
        const PX_TO_PT = 72 / 96; // CSS px → PDF points
        const pageW = (img.width / DSF) * PX_TO_PT;
        const pageH = (img.height / DSF) * PX_TO_PT;
        const pg = doc.addPage([pageW, pageH]);
        pg.drawImage(img, { x: 0, y: 0, width: pageW, height: pageH });

        const annots = links.map((l) => {
          const x1 = l.x * PX_TO_PT;
          const x2 = (l.x + l.w) * PX_TO_PT;
          // PDF origin is bottom-left; flip the y axis.
          const y1 = pageH - (l.y + l.h) * PX_TO_PT;
          const y2 = pageH - l.y * PX_TO_PT;
          return doc.context.register(
            doc.context.obj({
              Type: "Annot", Subtype: "Link", Rect: [x1, y1, x2, y2], Border: [0, 0, 0],
              A: doc.context.obj({ Type: "Action", S: "URI", URI: PDFString.of(l.href) }),
            })
          );
        });
        pg.node.set(PDFName.of("Annots"), doc.context.obj(annots));

        const bytes = await doc.save();
        return new NextResponse(new Uint8Array(bytes), {
          headers: {
            "Content-Type": "application/pdf",
            "Content-Disposition": `attachment; filename="${safeName}_Portfolio.pdf"`,
          },
        });
      }

      // HTML: inline stylesheets + fonts + images, drop scripts → self-contained static page.
      const html = await page.evaluate(async () => {
        const asDataUri = async (src: string): Promise<string | null> => {
          try {
            const blob = await (await fetch(src)).blob();
            return await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(blob);
            });
          } catch {
            return null;
          }
        };

        // Inline url(...) assets referenced inside a stylesheet — chiefly the
        // web fonts (JetBrains Mono etc.). Without this the downloaded file
        // falls back to a wider system mono, which overflows tight stat cells
        // like "Global Rank" and clips them to "#536,...".
        const inlineCssAssets = async (css: string, baseHref: string): Promise<string> => {
          const urls = new Set<string>();
          for (const m of css.matchAll(/url\(\s*(['"]?)([^'")]+)\1\s*\)/g)) {
            const u = m[2].trim();
            if (u && !u.startsWith("data:") && !u.startsWith("#")) urls.add(u);
          }
          for (const u of urls) {
            let abs: string;
            try { abs = new URL(u, baseHref).href; } catch { continue; }
            const data = await asDataUri(abs);
            if (data) css = css.split(u).join(data);
          }
          return css;
        };

        const links = Array.from(document.querySelectorAll('link[rel="stylesheet"]')) as HTMLLinkElement[];
        for (const link of links) {
          try {
            const css = await (await fetch(link.href)).text();
            const style = document.createElement("style");
            style.textContent = await inlineCssAssets(css, link.href);
            link.replaceWith(style);
          } catch { /* keep the link if fetch fails */ }
        }

        // Inline every image as a base64 data URI so the logo, profile photo,
        // certificates, etc. survive when the file is opened from disk (file://),
        // where root-relative paths like /logo-light.png can't resolve.
        const imgs = Array.from(document.querySelectorAll("img")) as HTMLImageElement[];
        await Promise.all(
          imgs.map(async (img) => {
            const src = img.currentSrc || img.src;
            if (!src || src.startsWith("data:")) return;
            const data = await asDataUri(src);
            if (data) {
              img.setAttribute("src", data);
              img.removeAttribute("srcset");
            }
          })
        );

        document.querySelectorAll("script").forEach((s) => s.remove());
        document.querySelectorAll('link[rel="preload"],link[rel="prefetch"],link[as="script"]').forEach((l) => l.remove());
        return "<!doctype html>\n" + document.documentElement.outerHTML;
      });

      return new NextResponse(html, {
        headers: {
          "Content-Type": "text/html; charset=utf-8",
          "Content-Disposition": `attachment; filename="${safeName}_Portfolio.html"`,
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("Export failed:", err);
    return NextResponse.json({ error: "export-failed" }, { status: 500 });
  }
}
