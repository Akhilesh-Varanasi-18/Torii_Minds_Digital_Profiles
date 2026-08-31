import { SiteHeader } from "@/components/SiteHeader";
import { LookupPanel } from "@/components/LookupPanel";
import { SectionTracker } from "@/components/SectionTracker";

/** Single-page workspace: sticky lookup panel on the left, scrolling content on the right. */
export function WorkspaceShell({
  children,
  activeCode,
  portfolioCode,
}: {
  children: React.ReactNode;
  activeCode?: string;
  portfolioCode?: string;
}) {
  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ambient background */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-[34rem] w-[34rem] rounded-full opacity-[0.12] blur-3xl" style={{ background: "var(--gradient)" }} />
        <div className="grid-bg absolute inset-0 opacity-30" />
      </div>

      <SiteHeader portfolioCode={portfolioCode} />

      <div className="mx-auto grid max-w-7xl gap-5 px-3 py-4 sm:px-6 lg:grid-cols-[350px_minmax(0,1fr)] lg:gap-6 lg:py-6">
        <aside className="lg:sticky lg:top-[84px] lg:h-fit lg:self-start">
          <LookupPanel activeCode={activeCode} />
          <SectionTracker />
        </aside>
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
