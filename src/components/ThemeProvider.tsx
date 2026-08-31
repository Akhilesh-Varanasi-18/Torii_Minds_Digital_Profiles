"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import {
  DEFAULT_MODE,
  DEFAULT_ORG,
  isMode,
  isOrg,
  type Mode,
  type OrgId,
} from "@/lib/themes";

interface ThemeCtx {
  org: OrgId;
  mode: Mode;
  setOrg: (o: OrgId) => void;
  setMode: (m: Mode) => void;
  toggleMode: () => void;
}

const Ctx = createContext<ThemeCtx | null>(null);

const ORG_KEY = "torii.org";
const MODE_KEY = "torii.mode";

export function ThemeProvider({
  children,
  initialOrg,
}: {
  children: React.ReactNode;
  /** when a portfolio page knows its owner's org, seed the theme with it */
  initialOrg?: OrgId;
}) {
  const [org, setOrgState] = useState<OrgId>(initialOrg ?? DEFAULT_ORG);
  const [mode, setModeState] = useState<Mode>(DEFAULT_MODE);

  // Hydrate from storage on mount (the no-flash script already set the DOM).
  useEffect(() => {
    const savedOrg = localStorage.getItem(ORG_KEY);
    const savedMode = localStorage.getItem(MODE_KEY);
    if (!initialOrg && isOrg(savedOrg)) setOrgState(savedOrg);
    if (isMode(savedMode)) setModeState(savedMode);
    else {
      const prefersDark = window.matchMedia(
        "(prefers-color-scheme: dark)"
      ).matches;
      setModeState(prefersDark ? "dark" : "light");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reflect state onto <html> and persist.
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute("data-org", org);
    root.setAttribute("data-mode", mode);
    root.style.colorScheme = mode;
    localStorage.setItem(ORG_KEY, org);
    localStorage.setItem(MODE_KEY, mode);
  }, [org, mode]);

  const setOrg = useCallback((o: OrgId) => setOrgState(o), []);
  const setMode = useCallback((m: Mode) => setModeState(m), []);
  const toggleMode = useCallback(
    () => setModeState((m) => (m === "light" ? "dark" : "light")),
    []
  );

  return (
    <Ctx.Provider value={{ org, mode, setOrg, setMode, toggleMode }}>
      {children}
    </Ctx.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("useTheme must be used within ThemeProvider");
  return ctx;
}

/** Inline script injected before paint to avoid a theme flash on load. */
export const noFlashScript = `
(function(){
  try {
    var o = localStorage.getItem('${ORG_KEY}');
    var m = localStorage.getItem('${MODE_KEY}');
    var orgs = ['torii','techhub','ncet'];
    if (orgs.indexOf(o) === -1) o = '${DEFAULT_ORG}';
    if (m !== 'light' && m !== 'dark') {
      m = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    var r = document.documentElement;
    r.setAttribute('data-org', o);
    r.setAttribute('data-mode', m);
    r.style.colorScheme = m;
  } catch (e) {
    document.documentElement.setAttribute('data-org','${DEFAULT_ORG}');
    document.documentElement.setAttribute('data-mode','${DEFAULT_MODE}');
  }
})();
`;
