/** Stylish placeholder shown on the home page before an employee code is entered. */
export function DummyPortfolio() {
  return (
    <div className="relative overflow-hidden rounded-2xl border" style={{ borderColor: "var(--line)", background: "var(--surface)", boxShadow: "0 8px 30px -16px rgb(var(--shadow-color) / 0.3)" }}>
      {/* faux portfolio behind a soft veil */}
      <div className="pointer-events-none select-none p-5 opacity-50 blur-[1.5px] sm:p-6">
        {/* faux header */}
        <div className="relative overflow-hidden rounded-2xl border p-5" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
          <span className="absolute left-0 top-0 h-full w-[5px]" style={{ background: "var(--primary)" }} />
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 flex-none rounded-full" style={{ background: "var(--gradient)" }} />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-40 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="h-3 w-24 rounded" style={{ background: "var(--tint)" }} />
              <div className="h-2.5 w-52 rounded" style={{ background: "var(--surface-2)" }} />
            </div>
          </div>
        </div>
        {/* faux coding cards */}
        <div className="mt-4 grid grid-cols-2 gap-4">
          {[0, 1].map((i) => (
            <div key={i} className="rounded-2xl border p-4" style={{ borderColor: "var(--line)", background: "var(--surface)" }}>
              <div className="mb-3 flex items-center gap-2">
                <div className="h-9 w-9 rounded-xl" style={{ background: "var(--gradient)" }} />
                <div className="h-3 w-20 rounded" style={{ background: "var(--surface-2)" }} />
              </div>
              <div className="h-8 w-24 rounded" style={{ background: "var(--surface-2)" }} />
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[0, 1, 2].map((j) => <div key={j} className="h-10 rounded-lg" style={{ background: "var(--surface-2)" }} />)}
              </div>
            </div>
          ))}
        </div>
        {/* faux chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {[16, 20, 14, 24, 18].map((w, i) => <div key={i} className="h-7 rounded-lg" style={{ width: `${w * 4}px`, background: "var(--surface-2)" }} />)}
        </div>
      </div>

      {/* overlay message */}
      <div className="absolute inset-0 grid place-items-center p-6" style={{ background: "color-mix(in srgb, var(--bg) 45%, transparent)" }}>
        <div className="max-w-sm rounded-2xl border p-6 text-center" style={{ borderColor: "var(--line)", background: "color-mix(in srgb, var(--surface) 88%, transparent)", boxShadow: "0 12px 40px -16px rgb(var(--shadow-color) / 0.4)", backdropFilter: "blur(4px)" }}>
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl text-white" style={{ background: "var(--gradient)", boxShadow: "0 8px 20px -8px rgb(var(--glow-color) / 0.6)" }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="m21 21-4.3-4.3" /><path d="M11 8v6M8 11h6" /></svg>
          </span>
          <h3 className="text-lg font-extrabold" style={{ color: "var(--ink)" }}>See a portfolio come to life</h3>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--body)" }}>
            Enter an <b>employee code</b> in the panel on the left to view their profile, live coding
            stats, projects & certifications — beautifully rendered in the Torii theme.
          </p>
          <p className="mt-3 font-mono text-xs" style={{ color: "var(--muted)" }}>e.g. TM0020</p>
        </div>
      </div>
    </div>
  );
}
