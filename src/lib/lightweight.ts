import type { Portfolio } from "@/types/portfolio";

/**
 * Replace heavy inline files (certificate PDFs/images, résumé) with on-demand
 * asset URLs. `origin` makes them absolute (needed for exported PDF/HTML so the
 * links resolve); pass "" for the live in-app view (relative URLs).
 */
export function lightweight(p: Portfolio, code: string, origin = ""): Portfolio {
  // Point click-through links at the in-app viewer (not the raw /asset bytes)
  // so certificates/résumés preview inline on mobile instead of downloading.
  // The viewer page fetches the actual bytes from /asset itself.
  const asset = (type: string, section?: string, id?: string) =>
    `${origin}/${code}/view?type=${type}` +
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
