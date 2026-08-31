"use client";

import { useEffect, useRef, useState } from "react";

/**
 * A vertical "pipeline" scroll tracker. Reads the portfolio sections from the
 * DOM ([data-section]), fills as the page scrolls, and jumps to a section when
 * a step is clicked. Renders nothing when there are no sections (e.g. home).
 * Desktop only — on mobile the panel stacks above the content so a scroll-spy
 * wouldn't make sense.
 */
export function SectionTracker() {
  const [sections, setSections] = useState<{ id: string; title: string }[]>([]);
  const [active, setActive] = useState(0);
  const [progress, setProgress] = useState(0);
  const elsRef = useRef<HTMLElement[]>([]);

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-section]"));
    elsRef.current = nodes;
    setSections(nodes.map((n) => ({ id: n.dataset.section!, title: n.dataset.title || n.dataset.section! })));
    if (nodes.length < 2) return;

    let raf = 0;
    const update = () => {
      raf = 0;
      const els = elsRef.current;
      if (els.length < 2) return;
      const markerY = window.innerHeight * 0.3; // "current" line, 30% down the viewport
      let idx = 0;
      els.forEach((el, i) => { if (el.getBoundingClientRect().top <= markerY) idx = i; });
      setActive(idx);
      // Fill is measured in DOT space (dots are evenly spaced), with smooth
      // interpolation through the current section, so it lines up with the dots.
      const curTop = els[idx].getBoundingClientRect().top;
      const cur = els[idx].getBoundingClientRect();
      const nextTop = idx < els.length - 1 ? els[idx + 1].getBoundingClientRect().top : curTop + cur.height;
      const denom = nextTop - curTop;
      const intra = denom > 0 ? Math.max(0, Math.min(1, (markerY - curTop) / denom)) : 0;
      setProgress((idx + intra) / (els.length - 1));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  if (sections.length < 2) return null;

  const go = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="card mt-3 hidden p-4 lg:block">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--muted)" }}>On this page</p>
      <div className="relative">
        {/* track (spans first dot center → last dot center) */}
        <div className="absolute bottom-3.5 left-[7px] top-3.5 w-0.5 rounded-full" style={{ background: "var(--surface-2)" }} />
        {/* fill */}
        <div className="absolute left-[7px] top-3.5 w-0.5 rounded-full" style={{ height: `calc(${progress} * (100% - 28px))`, background: "var(--primary)", transition: "height 0.12s linear" }} />
        <ul className="relative flex flex-col gap-0.5">
          {sections.map((s, i) => {
            const done = i <= active;
            const current = i === active;
            return (
              <li key={s.id}>
                <button onClick={() => go(s.id)} className="flex w-full items-center gap-3 rounded-lg py-1.5 pr-2 text-left transition-colors hover:bg-[var(--surface-2)]">
                  <span className="grid h-4 w-4 flex-none place-items-center rounded-full border-2 transition-all" style={{ borderColor: done ? "var(--primary)" : "var(--line)", background: current ? "var(--primary)" : done ? "var(--tint)" : "var(--surface)" }}>
                    {current && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                  </span>
                  <span className="truncate text-xs font-semibold" style={{ color: current ? "var(--primary)" : "var(--body)" }}>{s.title}</span>
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
