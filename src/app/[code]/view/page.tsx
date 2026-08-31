import { AssetViewer } from "@/components/AssetViewer";

export const dynamic = "force-dynamic";

// In-page preview for a certificate or résumé. The portfolio links here (via
// lightweight.ts) instead of straight to the raw /asset bytes, so mobile
// browsers preview the file inline instead of downloading it. The viewer
// fetches the actual bytes from the /asset route and renders them itself.
export default async function ViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ type?: string; section?: string; id?: string }>;
}) {
  const { code } = await params;
  const sp = await searchParams;

  const qs = new URLSearchParams();
  qs.set("type", sp.type ?? "");
  if (sp.section) qs.set("section", sp.section);
  if (sp.id) qs.set("id", sp.id);
  const assetUrl = `/api/portfolio/${encodeURIComponent(code)}/asset?${qs.toString()}`;

  const title = sp.type === "resume" ? "Résumé" : "Certificate";
  return <AssetViewer url={assetUrl} title={title} />;
}
