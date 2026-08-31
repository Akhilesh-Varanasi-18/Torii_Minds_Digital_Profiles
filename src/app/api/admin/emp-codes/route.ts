import { NextResponse } from "next/server";
import { formatEmployeeCode } from "@/types/portfolio";
import { verifyAdminPassword, registerEmpCode, ensureEmpCodesSeeded } from "@/lib/auth";

// POST /api/admin/emp-codes  { code, adminPassword }
// Admin-gated: adds a new employee code to the allowlist.
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const adminPassword = String(body.adminPassword ?? "");
    const code = formatEmployeeCode(String(body.code ?? ""));

    if (!code) {
      return NextResponse.json({ error: "missing-code" }, { status: 400 });
    }
    if (!(await verifyAdminPassword(adminPassword))) {
      return NextResponse.json({ error: "bad-admin-password" }, { status: 401 });
    }

    await ensureEmpCodesSeeded();
    const result = await registerEmpCode(code);
    return NextResponse.json({ ok: true, result, code }); // result: "added" | "exists"
  } catch (err) {
    console.error("POST /api/admin/emp-codes failed:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
