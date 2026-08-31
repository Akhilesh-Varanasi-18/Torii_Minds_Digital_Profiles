// Central registry of the three organizations and their per-mode logos.
// The CSS tokens live in globals.css; this file carries the metadata the
// UI needs (labels, brand swatch for the switcher, logo file per theme).

export type OrgId = "torii" | "techhub" | "ncet";
export type Mode = "light" | "dark";

export interface OrgTheme {
  id: OrgId;
  name: string;
  tagline: string;
  /** brand swatch shown in the theme switcher */
  swatch: string;
  /** logo files in /public, one per mode (verified against the assets) */
  logo: Record<Mode, string>;
  /** how wide the logo wants to render, in px, for balanced headers */
  logoWidth: number;
}

export const ORGS: Record<OrgId, OrgTheme> = {
  torii: {
    id: "torii",
    name: "Torii Minds",
    tagline: "Step in, stand out.",
    swatch: "#e2544c",
    logo: { light: "/logo-light.png", dark: "/tori-logo-dark.png" },
    logoWidth: 148,
  },
  techhub: {
    id: "techhub",
    name: "Technical Hub",
    tagline: "Code. Compete. Grow.",
    swatch: "#008738",
    logo: { light: "/technical-hub-logo.png", dark: "/technical-hub-logo.png" },
    logoWidth: 190,
  },
  ncet: {
    id: "ncet",
    name: "NCET",
    tagline: "Nagarjuna College of Engineering & Technology.",
    swatch: "#f6872a",
    logo: { light: "/ncetlogo_darktext.png", dark: "/ncetlogo_whitetext.png" },
    logoWidth: 60,
  },
};

export const ORG_LIST = Object.values(ORGS);

export const DEFAULT_ORG: OrgId = "torii";
export const DEFAULT_MODE: Mode = "light";

export function isOrg(v: unknown): v is OrgId {
  return v === "torii" || v === "techhub" || v === "ncet";
}
export function isMode(v: unknown): v is Mode {
  return v === "light" || v === "dark";
}
