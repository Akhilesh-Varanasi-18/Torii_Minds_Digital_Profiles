import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Lightweight liveness endpoint for uptime pingers. Hitting this every few
// minutes keeps the free Render instance awake, so links inside shared/
// downloaded portfolios (resume + certificate assets) don't land on a
// ~50s cold start. Deliberately does NO database work — it must stay cheap.
export async function GET() {
  return NextResponse.json({ ok: true, ts: new Date().toISOString() });
}
