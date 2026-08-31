import { NextResponse } from "next/server";
import { portfolios } from "@/lib/mongodb";
import { emptyPortfolio, formatEmployeeCode, ORG_CODE_PREFIX } from "@/types/portfolio";
import { isOrg, type OrgId } from "@/lib/themes";
import { verifyCreatePassword, isCodeAllowed, ensureEmpCodesSeeded } from "@/lib/auth";

// POST /api/portfolio — create a new portfolio { employeeCode, name, org, password }
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const org: OrgId = isOrg(body.org) ? body.org : "torii";
    const employeeCode = formatEmployeeCode(String(body.employeeCode ?? ""), ORG_CODE_PREFIX[org]);
    const name = String(body.name ?? "").trim();
    const password = String(body.password ?? "");

    if (!employeeCode || !name) {
      return NextResponse.json({ error: "missing-fields" }, { status: 400 });
    }

    // 1) Team password gate (validated server-side against a bcrypt hash).
    if (!(await verifyCreatePassword(password))) {
      return NextResponse.json({ error: "bad-password" }, { status: 401 });
    }

    // 2) Employee code must be registered in the allowlist.
    await ensureEmpCodesSeeded();
    if (!(await isCodeAllowed(employeeCode))) {
      return NextResponse.json({ error: "code-not-registered" }, { status: 403 });
    }

    // 3) Create (unless it already exists).
    const col = await portfolios();
    const existing = await col.findOne({ employeeCode });
    if (existing) {
      return NextResponse.json({ error: "exists" }, { status: 409 });
    }

    const doc = emptyPortfolio(employeeCode, name, org);
    await col.insertOne(doc);
    return NextResponse.json({ portfolio: doc }, { status: 201 });
  } catch (err) {
    console.error("POST /api/portfolio failed:", err);
    return NextResponse.json({ error: "internal" }, { status: 500 });
  }
}
