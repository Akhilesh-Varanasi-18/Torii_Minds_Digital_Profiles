import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { portfolios } from "@/lib/mongodb";
import { normalizeCode, type Portfolio } from "@/types/portfolio";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { lightweight } from "@/lib/lightweight";
import { ORGS, isMode, isOrg, type Mode, type OrgId } from "@/lib/themes";

export const dynamic = "force-dynamic";

// A chrome-free, single-theme render of the real PortfolioView — used as the
// source for PDF/HTML export (so exports look exactly like the live portfolio).
export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ org?: string; mode?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;
  const normalized = normalizeCode(code);

  const col = await portfolios();
  const p = (await col.findOne({ employeeCode: normalized }, { projection: { _id: 0 } })) as Portfolio | null;
  if (!p) notFound();

  const org: OrgId = isOrg(sp.org) ? sp.org : p.org;
  const mode: Mode = isMode(sp.mode) ? sp.mode : "light";

  const h = await headers();
  const origin = `${h.get("x-forwarded-proto") || "http"}://${h.get("host")}`;
  const view = lightweight(p, normalized, origin);
  const logo = ORGS[org].logo[mode];

  return (
    <div data-org={org} data-mode={mode} style={{ background: "var(--bg)", minHeight: "100vh" }}>
      <style>{`
        @page { size: A4; margin: 10mm; }
        .print-shell { max-width: 190mm; margin: 0 auto; padding: 10px 0 20px; }
        .print-brand { display:flex; align-items:center; justify-content:space-between; margin-bottom: 14px; }
        .print-brand img { height: 30px; width:auto; object-fit:contain; }
        .print-brand span { font-family: var(--font-mono); font-size:10px; letter-spacing:.14em; text-transform:uppercase; color: var(--muted); }
        /* pagination: let big sections flow across pages, never split a card */
        .pf-sec { break-inside: auto; }
        .pf-card { break-inside: avoid; }
        @media print { body { background: var(--bg) !important; } }
      `}</style>
      <div className="print-shell">
        <div className="print-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} alt={ORGS[org].name} />
          <span>Digital Portfolio</span>
        </div>
        <PortfolioView portfolio={view} print />
      </div>
    </div>
  );
}
