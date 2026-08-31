import { NextResponse } from "next/server";
import { portfolios } from "@/lib/mongodb";
import { normalizeCode, type Portfolio } from "@/types/portfolio";

type Params = { params: Promise<{ code: string }> };

// GET /api/portfolio/:code — fetch one portfolio
export async function GET(_req: Request, { params }: Params) {
  const { code } = await params;
  const employeeCode = normalizeCode(code);
  try {
    const col = await portfolios();
    const doc = await col.findOne({ employeeCode }, { projection: { _id: 0 } });
    if (!doc) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ portfolio: doc });
  } catch (err) {
    console.error("GET /api/portfolio/[code] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

// PUT /api/portfolio/:code — replace the editable fields of a portfolio
export async function PUT(req: Request, { params }: Params) {
  const { code } = await params;
  const employeeCode = normalizeCode(code);
  try {
    const body = (await req.json()) as Partial<Portfolio>;
    const col = await portfolios();

    // Only allow known editable fields through.
    const update: Partial<Portfolio> = {
      updatedAt: new Date().toISOString(),
    };
    if (body.name !== undefined) update.name = String(body.name).trim();
    if (body.org !== undefined) update.org = body.org;
    if (body.sectionOrder) update.sectionOrder = body.sectionOrder;
    if (body.profile) update.profile = body.profile;
    if (body.codingProfiles) update.codingProfiles = body.codingProfiles;
    if (body.technologies) update.technologies = body.technologies;
    if (body.aiSkills) update.aiSkills = body.aiSkills;
    if (body.projects) update.projects = body.projects;
    if (body.achievements) update.achievements = body.achievements;

    const result = await col.findOneAndUpdate(
      { employeeCode },
      { $set: update },
      { returnDocument: "after", projection: { _id: 0 } }
    );

    if (!result) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json({ portfolio: result });
  } catch (err) {
    console.error("PUT /api/portfolio/[code] failed:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
