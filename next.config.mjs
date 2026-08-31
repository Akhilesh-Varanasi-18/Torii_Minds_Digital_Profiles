/** @type {import('next').NextConfig} */
const nextConfig = {
  // Playwright is used only in a server route (PDF export) — never bundle it.
  serverExternalPackages: ["playwright"],
  images: {
    // Allow arbitrary remote images (profile photos, project images pasted as URLs).
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
};

export default nextConfig;
