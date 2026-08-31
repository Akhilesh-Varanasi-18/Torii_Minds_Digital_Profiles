import Link from "next/link";
import { portfolios } from "@/lib/mongodb";
import { normalizeCode, type Portfolio } from "@/types/portfolio";
import { PortfolioView } from "@/components/portfolio/PortfolioView";
import { WorkspaceShell } from "@/components/WorkspaceShell";
import { lightweight } from "@/lib/lightweight";

export const dynamic = "force-dynamic";

async function getPortfolio(code: string): Promise<Portfolio | null> {
  const col = await portfolios();
  // Exclude the heavy inline certificate files from the read entirely — the
  // view only needs the thumbnails; full files are streamed on demand.
  return col.findOne(
    { employeeCode: normalizeCode(code) },
    {
      projection: {
        _id: 0,
        "technologies.certificateUrl": 0,
        "aiSkills.certificateUrl": 0,
        "achievements.certificateUrl": 0,
      },
    }
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const p = await getPortfolio(code);
  if (!p) return { title: "Portfolio not found · Torii" };
  return {
    title: `${p.name} · Portfolio`,
    description: p.profile.tagline || p.profile.headline || `${p.name}'s digital portfolio`,
  };
}

function NotFoundRight({ code }: { code: string }) {
  return (
    <div className="grid min-h-[60vh] place-items-center rounded-2xl border p-8 text-center" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
      <div className="max-w-sm">
        <p className="font-mono text-5xl font-extrabold gradient-text">404</p>
        <h1 className="mt-4 text-xl font-bold" style={{ color: "var(--ink)" }}>No portfolio for “{code}”</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--muted)" }}>
          Nothing exists for that employee code yet. Use <b>Create new</b> in the panel on the left to
          make one, or check the code and try again.
        </p>
        <Link href="/" className="btn btn-ghost mt-5 text-sm">← Back home</Link>
      </div>
    </div>
  );
}

export default async function PortfolioPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const normalized = normalizeCode(code);
  const portfolio = await getPortfolio(code);
  return (
    <WorkspaceShell activeCode={normalized} portfolioCode={portfolio ? normalized : undefined}>
      {portfolio ? <PortfolioView portfolio={lightweight(portfolio, normalized)} /> : <NotFoundRight code={normalized} />}
    </WorkspaceShell>
  );
}
