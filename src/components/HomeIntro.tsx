import { ORG_LIST } from "@/lib/themes";

export function HomeIntro() {
  return (
    <div>
      <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-wider" style={{ color: "var(--primary)", borderColor: "var(--line)", background: "var(--surface)" }}>
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: "var(--primary)" }} />
        Digital Portfolios
      </span>
      <h1 className="mt-4 text-4xl font-extrabold leading-[1.05] tracking-tight sm:text-5xl">
        One link. <span className="gradient-text">Every portfolio.</span>
      </h1>
      <p className="mt-4 max-w-2xl text-base leading-relaxed" style={{ color: "var(--body)" }}>
        Your work, your coding stats, your projects & certifications — assembled into a beautiful page
        that builds itself from your employee code. No login: enter a code on the left to view a portfolio,
        or create your own.
      </p>
      <div className="mt-5 flex flex-wrap items-center gap-2.5">
        {ORG_LIST.map((o) => (
          <div key={o.id} className="flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm" style={{ borderColor: "var(--line)", background: "var(--surface)", color: "var(--ink)" }}>
            <span className="h-3 w-3 rounded-full" style={{ background: o.swatch }} />
            {o.name}
          </div>
        ))}
      </div>
    </div>
  );
}
