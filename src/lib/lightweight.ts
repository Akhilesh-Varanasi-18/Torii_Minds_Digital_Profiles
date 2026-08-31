import type { Portfolio } from "@/types/portfolio";

/**
 * Replace heavy inline files (certificate PDFs/images, résumé) with on-demand
 * asset URLs. `origin` makes them absolute (needed for exported PDF/HTML so the
 * links resolve); pass "" for the live in-app view (relative URLs).
 */
export function lightweight(p: Portfolio, code: string, origin = ""): Portfolio {
  const asset = (type: string, section?: string, id?: string) =>
    `${origin}/api/portfolio/${code}/asset?type=${type}` +
    (section ? `&section=${section}` : "") +
    (id ? `&id=${encodeURIComponent(id)}` : "");

  const strip = <T extends { id: string; certificateThumb?: string }>(list: T[] | undefined, section: string): (T & { certificateUrl?: string })[] =>
    (list ?? []).map((x) => (x.certificateThumb ? { ...x, certificateUrl: asset("cert", section, x.id) } : x));

  const resumeUrl = p.profile?.resumeUrl
    ? p.profile.resumeUrl.startsWith("data:")
      ? asset("resume")
      : p.profile.resumeUrl
    : undefined;

  return {
    ...p,
    profile: { ...p.profile, resumeUrl },
    technologies: strip(p.technologies, "technologies"),
    aiSkills: strip(p.aiSkills, "aiSkills"),
    achievements: strip(p.achievements, "achievements"),
  };
}
