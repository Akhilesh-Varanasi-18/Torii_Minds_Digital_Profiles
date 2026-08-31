import { NextResponse } from "next/server";
import { portfolios } from "@/lib/mongodb";
import { normalizeCode } from "@/types/portfolio";

export const dynamic = "force-dynamic";

const CRED_SECTIONS = new Set(["technologies", "aiSkills", "achievements"]);

// GET /api/portfolio/:code/asset?type=cert&section=technologies&id=<itemId>
// GET /api/portfolio/:code/asset?type=resume
// Streams a single heavy file (stored inline as a data URL) on demand, so the
// portfolio page itself never has to ship megabytes of certificates.
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const url = new URL(req.url);
  const type = url.searchParams.get("type");
  const section = url.searchParams.get("section");
  const id = url.searchParams.get("id");

  const col = await portfolios();
  const query = { employeeCode: normalizeCode(code) };

  // Project ONLY the one file we need. The full document is several MB (every
  // certificate's base64 data), so reading it whole per asset was extremely
  // slow (tens of seconds) — the viewer would sit on "Loading…" the whole time.
  let dataUrl: string | undefined;
  if (type === "resume") {
    const p = await col.findOne(query, { projection: { _id: 0, "profile.resumeUrl": 1 } });
    if (!p) return new NextResponse("Not found", { status: 404 });
    dataUrl = p.profile?.resumeUrl;
  } else if (type === "cert" && section && id && CRED_SECTIONS.has(section)) {
    // $elemMatch returns just the one matching item from the section array.
    const p = await col.findOne(query, { projection: { _id: 0, [section]: { $elemMatch: { id } } } });
    if (!p) return new NextResponse("Not found", { status: 404 });
    const list = (p as unknown as Record<string, Array<{ id: string; certificateUrl?: string }>>)[section] ?? [];
    dataUrl = list[0]?.certificateUrl;
  } else {
    return new NextResponse("Bad request", { status: 400 });
  }

  if (!dataUrl) return new NextResponse("Not found", { status: 404 });
  // External link — just redirect to it.
  if (!dataUrl.startsWith("data:")) return NextResponse.redirect(dataUrl);

  const m = dataUrl.match(/^data:([^;]+);base64,([\s\S]*)$/);
  if (!m) return new NextResponse("Bad asset", { status: 400 });
  const bytes = Buffer.from(m[2], "base64");
  return new NextResponse(new Uint8Array(bytes), {
    headers: {
      "Content-Type": m[1],
      "Content-Disposition": "inline",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
