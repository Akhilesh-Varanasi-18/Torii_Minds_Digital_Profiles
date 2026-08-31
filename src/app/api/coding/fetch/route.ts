import { NextResponse } from "next/server";
import { fetchCodingProfile, PLATFORM_META } from "@/lib/coding";
import type { CodingPlatform } from "@/types/portfolio";

export const runtime = "nodejs";
export const maxDuration = 30;

// POST /api/coding/fetch  { platform, url }
// Returns normalized stats for one coding profile.
export async function POST(req: Request) {
  try {
    const { platform, url } = await req.json();
    if (!platform || !(platform in PLATFORM_META)) {
      return NextResponse.json({ error: "Unknown platform" }, { status: 400 });
    }
    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "A profile URL is required" }, { status: 400 });
    }

    const data = await fetchCodingProfile(platform as CodingPlatform, url);
    return NextResponse.json({ ok: true, data });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    // 200 with ok:false so the client can show the profile with a soft warning
    // rather than treating a fragile scrape as a hard error.
    return NextResponse.json({ ok: false, error: message });
  }
}
