import type {
  CodingPlatform,
  CodingStat,
} from "@/types/portfolio";

// ---------------------------------------------------------------------------
// Coding-platform adapters.
// Each adapter turns a profile URL (or bare username) into a normalized set
// of stats. Official APIs (LeetCode GraphQL, GitHub, Codeforces) are reliable;
// the scrape-based ones (CodeChef, HackerRank, GeeksforGeeks) are best-effort
// and degrade gracefully to just the username + link when the page changes.
// ---------------------------------------------------------------------------

export interface FetchedProfile {
  username: string;
  displayName?: string;
  avatarUrl?: string;
  stats: CodingStat[];
}

export const PLATFORM_META: Record<
  CodingPlatform,
  { name: string; color: string; placeholder: string; reliable: boolean }
> = {
  leetcode: { name: "LeetCode", color: "#FFA116", placeholder: "https://leetcode.com/u/username", reliable: true },
  github: { name: "GitHub", color: "#6e7681", placeholder: "https://github.com/username", reliable: true },
  codeforces: { name: "Codeforces", color: "#1F8ACB", placeholder: "https://codeforces.com/profile/handle", reliable: true },
  codechef: { name: "CodeChef", color: "#5B4638", placeholder: "https://www.codechef.com/users/username", reliable: false },
  hackerrank: { name: "HackerRank", color: "#00EA64", placeholder: "https://www.hackerrank.com/profile/username", reliable: false },
  geeksforgeeks: { name: "GeeksforGeeks", color: "#2F8D46", placeholder: "https://www.geeksforgeeks.org/user/username", reliable: false },
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0 Safari/537.36";

/** Pull a username out of a profile URL for a given platform (or accept bare handle). */
export function extractUsername(platform: CodingPlatform, input: string): string {
  const raw = input.trim();
  if (!raw) return "";
  // If it's not a URL, treat it as the username directly.
  if (!/^https?:\/\//i.test(raw) && !raw.includes("/")) return raw;

  let path = raw;
  try {
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    path = u.pathname;
  } catch {
    /* fall through with raw */
  }
  const parts = path.split("/").filter(Boolean);
  if (parts.length === 0) return raw;

  switch (platform) {
    case "leetcode":
      // /u/name  or  /name
      return parts[0] === "u" ? parts[1] ?? "" : parts[0];
    case "github":
      return parts[0];
    case "codeforces":
      // /profile/name
      return parts[0] === "profile" ? parts[1] ?? "" : parts[0];
    case "codechef":
      // /users/name
      return parts[0] === "users" ? parts[1] ?? "" : parts[parts.length - 1];
    case "hackerrank":
      // /profile/name
      return parts[0] === "profile" ? parts[1] ?? "" : parts[parts.length - 1];
    case "geeksforgeeks":
      // /user/name  or auth.geeksforgeeks.org/user/name
      return parts[0] === "user" ? parts[1] ?? "" : parts[parts.length - 1];
    default:
      return parts[parts.length - 1];
  }
}

// ----------------------------- LeetCode ------------------------------------
async function fetchLeetCode(username: string): Promise<FetchedProfile> {
  const query = `
    query userProfile($username: String!) {
      matchedUser(username: $username) {
        username
        profile { realName userAvatar ranking }
        submitStatsGlobal { acSubmissionNum { difficulty count } }
      }
      userContestRanking(username: $username) {
        attendedContestsCount rating globalRanking topPercentage
      }
    }`;
  const res = await fetch("https://leetcode.com/graphql", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Referer: `https://leetcode.com/u/${username}/`,
      "User-Agent": UA,
    },
    body: JSON.stringify({ query, variables: { username } }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`LeetCode returned ${res.status}`);
  const json = await res.json();
  const u = json?.data?.matchedUser;
  if (!u) throw new Error("LeetCode user not found");

  const ac: Array<{ difficulty: string; count: number }> =
    u.submitStatsGlobal?.acSubmissionNum ?? [];
  const by = (d: string) => ac.find((a) => a.difficulty === d)?.count ?? 0;
  const contest = json?.data?.userContestRanking;

  const stats: CodingStat[] = [
    { label: "Total Solved", value: by("All"), kind: "solved" },
    { label: "Easy", value: by("Easy"), kind: "solved" },
    { label: "Medium", value: by("Medium"), kind: "solved" },
    { label: "Hard", value: by("Hard"), kind: "solved" },
  ];
  if (u.profile?.ranking) {
    stats.push({ label: "Global Rank", value: `#${u.profile.ranking.toLocaleString("en-US")}`, kind: "rank" });
  }
  if (contest) {
    if (contest.rating)
      stats.push({ label: "Contest Rating", value: Math.round(contest.rating), kind: "rating" });
    if (contest.attendedContestsCount)
      stats.push({ label: "Contests", value: contest.attendedContestsCount, kind: "contest" });
    if (contest.topPercentage)
      stats.push({ label: "Top %", value: `${contest.topPercentage.toFixed(1)}%`, kind: "meta" });
  }

  return {
    username: u.username,
    displayName: u.profile?.realName || u.username,
    avatarUrl: u.profile?.userAvatar,
    stats,
  };
}

// ------------------------------- GitHub ------------------------------------
async function fetchGitHub(username: string): Promise<FetchedProfile> {
  const headers: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": UA,
  };
  if (process.env.GITHUB_TOKEN) headers.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;

  const userRes = await fetch(`https://api.github.com/users/${username}`, {
    headers,
    cache: "no-store",
  });
  if (!userRes.ok) throw new Error(`GitHub returned ${userRes.status}`);
  const user = await userRes.json();

  // Top repos → total stars + top languages (best-effort, one page).
  let totalStars = 0;
  const langCount: Record<string, number> = {};
  try {
    const reposRes = await fetch(
      `https://api.github.com/users/${username}/repos?per_page=100&sort=pushed`,
      { headers, cache: "no-store" }
    );
    if (reposRes.ok) {
      const repos: Array<{ stargazers_count: number; language: string | null; fork: boolean }> =
        await reposRes.json();
      for (const r of repos) {
        totalStars += r.stargazers_count || 0;
        if (r.language) langCount[r.language] = (langCount[r.language] || 0) + 1;
      }
    }
  } catch {
    /* ignore repo enrichment failures */
  }
  const topLangs = Object.entries(langCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([l]) => l)
    .join(", ");

  const stats: CodingStat[] = [
    { label: "Public Repos", value: user.public_repos ?? 0, kind: "solved" },
    { label: "Followers", value: user.followers ?? 0, kind: "rank" },
    { label: "Following", value: user.following ?? 0, kind: "meta" },
    { label: "Total Stars", value: totalStars, kind: "rating" },
  ];
  if (topLangs) stats.push({ label: "Top Languages", value: topLangs, kind: "meta" });

  return {
    username: user.login,
    displayName: user.name || user.login,
    avatarUrl: user.avatar_url,
    stats,
  };
}

// ----------------------------- Codeforces ----------------------------------
async function fetchCodeforces(handle: string): Promise<FetchedProfile> {
  const infoRes = await fetch(
    `https://codeforces.com/api/user.info?handles=${handle}`,
    { headers: { "User-Agent": UA }, cache: "no-store" }
  );
  if (!infoRes.ok) throw new Error(`Codeforces returned ${infoRes.status}`);
  const info = await infoRes.json();
  if (info.status !== "OK" || !info.result?.[0]) throw new Error("Codeforces user not found");
  const u = info.result[0];

  // Distinct solved problems + contests attended, from submission history.
  let solved = 0;
  let contests = 0;
  try {
    const statusRes = await fetch(
      `https://codeforces.com/api/user.status?handle=${handle}`,
      { headers: { "User-Agent": UA }, cache: "no-store" }
    );
    if (statusRes.ok) {
      const status = await statusRes.json();
      if (status.status === "OK") {
        const solvedSet = new Set<string>();
        for (const sub of status.result) {
          if (sub.verdict === "OK" && sub.problem) {
            solvedSet.add(`${sub.problem.contestId}-${sub.problem.index}`);
          }
        }
        solved = solvedSet.size;
      }
    }
    const ratingRes = await fetch(
      `https://codeforces.com/api/user.rating?handle=${handle}`,
      { headers: { "User-Agent": UA }, cache: "no-store" }
    );
    if (ratingRes.ok) {
      const r = await ratingRes.json();
      if (r.status === "OK") contests = r.result.length;
    }
  } catch {
    /* ignore enrichment failures */
  }

  const stats: CodingStat[] = [];
  if (solved) stats.push({ label: "Problems Solved", value: solved, kind: "solved" });
  if (u.rating) stats.push({ label: "Rating", value: u.rating, kind: "rating" });
  if (u.maxRating) stats.push({ label: "Max Rating", value: u.maxRating, kind: "rating" });
  if (u.rank) stats.push({ label: "Rank", value: titleCase(u.rank), kind: "rank" });
  if (contests) stats.push({ label: "Contests", value: contests, kind: "contest" });

  return {
    username: u.handle,
    displayName: [u.firstName, u.lastName].filter(Boolean).join(" ") || u.handle,
    avatarUrl: u.titlePhoto?.startsWith("http") ? u.titlePhoto : undefined,
    stats,
  };
}

// ------------------- scrape-based (best-effort, fragile) -------------------
async function getHtml(url: string): Promise<string> {
  const res = await fetch(url, { headers: { "User-Agent": UA }, cache: "no-store" });
  if (!res.ok) throw new Error(`${url} returned ${res.status}`);
  return res.text();
}

function codechefStars(r: number): string {
  const n = r >= 2500 ? 7 : r >= 2200 ? 6 : r >= 2000 ? 5 : r >= 1800 ? 4 : r >= 1600 ? 3 : r >= 1400 ? 2 : 1;
  return `${n}★`;
}
async function fetchCodeChef(username: string): Promise<FetchedProfile> {
  const html = await getHtml(`https://www.codechef.com/users/${username}`);
  const solved = html.match(/Total Problems Solved:\s*(\d+)/)?.[1];
  const globalRank = html.match(/class=['"]global-rank['"]>(\d+)/)?.[1];
  const countryRank = html.match(/class=['"]country-rank['"]>(\d+)/)?.[1];
  // Current rating = the most recent entry in the embedded rating history.
  const ratings = [...html.matchAll(/"rating":"(\d+)"/g)].map((m) => Number(m[1]));
  const rating = ratings.length ? ratings[ratings.length - 1] : undefined;

  const stats: CodingStat[] = [];
  if (rating) stats.push({ label: "Rating", value: rating, kind: "rating" });
  if (rating) stats.push({ label: "Stars", value: codechefStars(rating), kind: "meta" });
  if (solved) stats.push({ label: "Problems Solved", value: +solved, kind: "solved" });
  if (globalRank && +globalRank > 0) stats.push({ label: "Global Rank", value: `#${(+globalRank).toLocaleString("en-US")}`, kind: "rank" });
  if (countryRank && +countryRank > 0) stats.push({ label: "Country Rank", value: `#${(+countryRank).toLocaleString("en-US")}`, kind: "rank" });
  if (stats.length === 0) throw new Error("Could not parse CodeChef profile");
  return { username, displayName: username, stats };
}

async function fetchHackerRank(username: string): Promise<FetchedProfile> {
  // HackerRank is behind Cloudflare and exposes no reliable public stats API.
  // Try the REST endpoint; if it's blocked (the usual case), fail cleanly so
  // the profile is shown as a link-only card rather than with bogus data.
  try {
    const res = await fetch(`https://www.hackerrank.com/rest/hackers/${username}/profile`, {
      headers: { "User-Agent": UA, Accept: "application/json" },
      cache: "no-store",
    });
    if (res.ok) {
      const json = await res.json();
      const m = json?.model;
      if (m && m.username) {
        const stats: CodingStat[] = [];
        if (m.jobs_headline) stats.push({ label: "Headline", value: m.jobs_headline, kind: "meta" });
        if (typeof m.followers_count === "number") stats.push({ label: "Followers", value: m.followers_count, kind: "rank" });
        if (stats.length) return { username, displayName: m.name || username, avatarUrl: m.avatar, stats };
      }
    }
  } catch {
    /* fall through to error */
  }
  throw new Error("HackerRank blocks automated stat reads — added as a link.");
}

async function fetchGeeksforGeeks(username: string): Promise<FetchedProfile> {
  // /user/<name>/ 301-redirects to /profile/<name> (fetch follows). Stats are
  // embedded as escaped JSON in the streamed markup, e.g.  \"score\":123 .
  const html = await getHtml(`https://www.geeksforgeeks.org/user/${username}/`);
  const num = (re: RegExp) => {
    const m = html.match(re);
    return m ? Number(m[1]) : undefined;
  };
  const score = num(/\\"score\\":(\d+)/);
  const solved = num(/\\"total_problems_solved\\":(\d+)/);
  const streak = num(/\\"pod_solved_longest_streak\\":(\d+)/);
  const instRank = html.match(/\\"institute_rank\\":\\"([^"\\]+)\\"/)?.[1];

  const stats: CodingStat[] = [];
  if (typeof solved === "number") stats.push({ label: "Problems Solved", value: solved, kind: "solved" });
  if (typeof score === "number") stats.push({ label: "Coding Score", value: score, kind: "rating" });
  if (typeof streak === "number" && streak > 0) stats.push({ label: "Max Streak", value: streak, kind: "meta" });
  if (instRank) stats.push({ label: "Institute Rank", value: `#${instRank}`, kind: "rank" });
  if (stats.length === 0) throw new Error("Could not read GeeksforGeeks profile");
  return { username, displayName: username, stats };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// ------------------------------ dispatcher ---------------------------------
export async function fetchCodingProfile(
  platform: CodingPlatform,
  input: string
): Promise<FetchedProfile> {
  const username = extractUsername(platform, input);
  if (!username) throw new Error("Could not determine username from the URL");

  switch (platform) {
    case "leetcode":
      return fetchLeetCode(username);
    case "github":
      return fetchGitHub(username);
    case "codeforces":
      return fetchCodeforces(username);
    case "codechef":
      return fetchCodeChef(username);
    case "hackerrank":
      return fetchHackerRank(username);
    case "geeksforgeeks":
      return fetchGeeksforGeeks(username);
    default:
      throw new Error("Unsupported platform");
  }
}
