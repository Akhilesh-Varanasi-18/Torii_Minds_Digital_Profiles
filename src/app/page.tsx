import { WorkspaceShell } from "@/components/WorkspaceShell";
import { HomeIntro } from "@/components/HomeIntro";
import { DummyPortfolio } from "@/components/DummyPortfolio";

export default function HomePage() {
  return (
    <WorkspaceShell>
      <div className="flex flex-col gap-6">
        <HomeIntro />
        <DummyPortfolio />
      </div>
    </WorkspaceShell>
  );
}
