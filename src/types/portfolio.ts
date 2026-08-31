import type { OrgId } from "@/lib/themes";

// ---- Section identifiers & ordering -------------------------------------
export type SectionId = "profile" | "coding" | "tech" | "ai" | "projects" | "achievements";

export const ALL_SECTIONS: SectionId[] = [
  "profile",
  "coding",
  "tech",
  "ai",
  "projects",
  "achievements",
];

export const SECTION_META: Record<SectionId, { title: string; blurb: string }> = {
  profile: { title: "Profile", blurb: "Photo, bio, socials & Resume" },
  coding: { title: "Coding Profiles", blurb: "Auto-fetched platform stats" },
  tech: { title: "Technologies", blurb: "Skills & certifications" },
  ai: { title: "AI Skills", blurb: "AI expertise & levels" },
  projects: { title: "Projects", blurb: "What you've built" },
  achievements: { title: "Achievements & Certifications", blurb: "Other credentials, awards & wins" },
};

/** Ensure an existing portfolio's order includes every known section
 *  (older documents predate newer sections). Unknown ids are dropped. */
export function ensureSections(order?: SectionId[]): SectionId[] {
  const valid = (order ?? []).filter((s) => ALL_SECTIONS.includes(s));
  const missing = ALL_SECTIONS.filter((s) => !valid.includes(s));
  return [...valid, ...missing];
}

// ---- Section item shapes (every field optional by design) ---------------
export interface SocialLink {
  id: string;
  platform: string; // linkedin, github, twitter, website...
  url: string;
}

export interface ProfileData {
  photoUrl?: string;
  headline?: string; // e.g. "Full-Stack Engineer"
  tagline?: string;
  bio?: string;
  location?: string;
  email?: string;
  phone?: string;
  resumeUrl?: string;
  resumeName?: string; // original filename when uploaded from device
  socials: SocialLink[];
}

export type CodingPlatform =
  | "leetcode"
  | "github"
  | "codeforces"
  | "codechef"
  | "hackerrank"
  | "geeksforgeeks";

/** Normalized stat rows fetched from a coding platform. */
export interface CodingStat {
  label: string;
  value: string | number;
  /** optional grouping key so the UI can style e.g. difficulty splits */
  kind?: "solved" | "rank" | "rating" | "contest" | "meta";
}

export interface CodingProfile {
  id: string;
  platform: CodingPlatform;
  profileUrl: string;
  username?: string;
  displayName?: string;
  avatarUrl?: string;
  stats: CodingStat[];
  lastFetchedAt?: string;
  fetchStatus: "ok" | "failed" | "pending";
  fetchError?: string;
}

export interface Technology {
  id: string;
  name: string;
  certification?: string;
  issuer?: string;
  verificationId?: string;
  verificationUrl?: string;
  certificateUrl?: string; // uploaded certificate image/PDF (data URL or link)
  certificateName?: string;
  certificateThumb?: string; // image preview (page-1 render for PDFs)
}

// AI skills use the same field set as technologies (a "credential").
export interface AiSkill {
  id: string;
  name: string;
  certification?: string;
  issuer?: string;
  verificationId?: string;
  verificationUrl?: string;
  certificateUrl?: string; // uploaded certificate image/PDF (data URL or link)
  certificateName?: string;
  certificateThumb?: string; // image preview (page-1 render for PDFs)
}

/** Common shape shared by Technology and AiSkill (both are credentials). */
export type Credential = Technology & AiSkill;

// A standalone achievement / certification (outside Technologies & AI Skills).
export interface Achievement {
  id: string;
  name: string; // certification / achievement name
  issuer?: string; // "issued by"
  verificationId?: string; // certification ID
  verificationUrl?: string;
  certificateUrl?: string;
  certificateName?: string;
  certificateThumb?: string;
}

export interface Project {
  id: string;
  name: string;
  imageUrl?: string;
  url?: string;
  description?: string;
  techStack: string[];
}

// ---- The full portfolio document ---------------------------------------
export interface Portfolio {
  employeeCode: string; // primary key
  name: string;
  org: OrgId; // which organization this employee belongs to (default theme)
  sectionOrder: SectionId[];
  profile: ProfileData;
  codingProfiles: CodingProfile[];
  technologies: Technology[];
  aiSkills: AiSkill[];
  projects: Project[];
  achievements: Achievement[];
  createdAt: string;
  updatedAt: string;
}

export function emptyPortfolio(
  employeeCode: string,
  name: string,
  org: OrgId
): Portfolio {
  const now = new Date().toISOString();
  return {
    employeeCode,
    name,
    org,
    sectionOrder: [...ALL_SECTIONS],
    profile: { socials: [] },
    codingProfiles: [],
    technologies: [],
    aiSkills: [],
    projects: [],
    achievements: [],
    createdAt: now,
    updatedAt: now,
  };
}

/** Normalize a raw employee code: trim, uppercase, collapse spaces. */
export function normalizeCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

/** Default code prefix per organization (e.g. Torii Minds → "TM0020"). */
export const ORG_CODE_PREFIX: Record<OrgId, string> = {
  torii: "TM",
  techhub: "TH",
  ncet: "NC",
};

/**
 * Turn whatever the user types into a canonical employee code.
 *   "0020"     → "TM0020"   (bare digits get the org prefix + 4-digit pad)
 *   "20"       → "TM0020"
 *   "TM20"     → "TM0020"   (existing prefix kept, digit tail padded to 4)
 *   "TM0020"   → "TM0020"
 *   "ADMIN"    → "ADMIN"    (non-standard codes pass through, uppercased)
 */
export function formatEmployeeCode(raw: string, orgPrefix = "TM"): string {
  const s = normalizeCode(raw);
  if (!s) return "";
  if (/^\d+$/.test(s)) return `${orgPrefix}${s.padStart(4, "0")}`;
  const m = s.match(/^([A-Z]+)(\d+)$/);
  if (m) return `${m[1]}${m[2].padStart(4, "0")}`;
  return s;
}
